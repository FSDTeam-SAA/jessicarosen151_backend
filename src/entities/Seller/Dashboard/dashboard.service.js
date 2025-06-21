import Order from "../../Payment/order.model.js";
import Resource from "../../resource/resource.model.js";


export const getSellerDashboardSummaryService = async (sellerId) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // ---------- Revenue ----------
    const revenueAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            "items.seller": sellerId,
            paymentStatus: "paid"
        }
        },
        {
        $group: {
            _id: null,
            totalRevenue: {
            $sum: {
                $divide: [
                { $multiply: ["$items.price", "$items.quantity"] },
                2 // Seller's share
                ]
            }
            }
        }
        }
    ]);
    
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;


    // ---------- Live Products ----------
    const liveProducts = await Resource.countDocuments({
        createdBy: sellerId,
        status: "approved"
    });


    // ---------- Product Sell by Practice Area ----------
    const productSellAgg = await Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        { $match: { "items.seller": sellerId } },
        {
        $lookup: {
            from: "resources",
            localField: "items.resource",
            foreignField: "_id",
            as: "resourceInfo"
        }
        },
        { $unwind: "$resourceInfo" },
        { $unwind: "$resourceInfo.practiceAreas" },
        {
        $group: {
            _id: "$resourceInfo.practiceAreas",
            totalSold: { $sum: "$items.quantity" }
        }
        },
        { $sort: { totalSold: -1 } }
    ]);

    const totalQuantity = productSellAgg.reduce((sum, item) => sum + item.totalSold, 0);
    const productSell = productSellAgg.map(item => ({
        name: item._id,
        percentage: totalQuantity
        ? Math.round((item.totalSold / totalQuantity) * 100)
        : 0
    }));


    // ---------- New Products (Daily/Weekly/Monthly/Yearly) ----------
    const startOfDay = new Date(currentYear, now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const startOfYear = new Date(currentYear, 0, 1);

    const countProducts = async (start) => {
        return await Resource.countDocuments({
        createdBy: sellerId,
        createdAt: { $gte: start }
        });
    };

    const newProducts = {
        thisDay: await countProducts(startOfDay),
        thisWeek: await countProducts(startOfWeek),
        thisMonth: await countProducts(startOfMonth),
        thisYear: await countProducts(startOfYear),
    };


    return {
        totalRevenue,
        liveProducts,
        productSell,
        newProducts
    };
};



export const getSellerRevenueReportService = async (sellerId, filter = "month") => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate;
    let unit; // "day" or "month"
    let range = [];


    if (filter === "day") {
        unit = "day";
        startDate = new Date(currentYear, currentMonth, now.getDate());
        range = [{ date: formatDate(startDate), revenue: 0 }];
    } 
    else if (filter === "week") {
        unit = "day";
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startDate = startOfWeek;

        const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        range.push({
            day: weekDayNames[date.getDay()],
            key: formatDate(date),
            revenue: 0
        });
        }
    } 
    else if (filter === "month") {
        unit = "month";
        startDate = new Date(currentYear, 0, 1);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        range.push({ month: monthNames[i], key: formatMonth(date), revenue: 0 });
        }
    } 
    else {
        throw new Error("Invalid filter. Use one of: day, week, month");
    }

    const format = unit === "month" ? "%Y-%m" : "%Y-%m-%d";

    const agg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            "items.seller": sellerId,
            paymentStatus: "paid",
            createdAt: { $gte: startDate }
        }
        },
        {
        $group: {
            _id: { date: { $dateToString: { format, date: "$createdAt" } } },
            total: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        },
        { $sort: { "_id.date": 1 } }
    ]);


    let final;
    const aggMap = new Map(agg.map(i => [i._id.date, Math.round(i.total / 2)]));

    if (filter === "month") {
        final = range.map(item => ({
        month: item.month,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else if (filter === "week") {
        final = range.map(item => ({
        day: item.day,
        revenue: aggMap.get(item.key) || 0
        }));
    } 
    else {
        final = range.map(item => ({
        date: item.date,
        revenue: aggMap.get(item.date) || 0
        }));
    }

    return final;
};


// Utility functions
const formatDate = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD
const formatMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;




export const getSellerSalesHistoryService = async (sellerId, search, page = 1, limit = 10) => {
  const matchStage = {
    $match: {
      "items.seller": sellerId,
      paymentStatus: "paid"
    }
  };

  const searchMatch = search
    ? {
        $match: {
          "resource.productId": { $regex: search, $options: "i" }
        }
      }
    : null;

  const basePipeline = [
    { $unwind: "$items" },
    matchStage,
    {
      $group: {
        _id: "$items.resource",
        quantity: { $sum: "$items.quantity" },
        amount: {
          $sum: {
            $divide: [
              { $multiply: ["$items.price", "$items.quantity"] },
              2
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: "resources",
        localField: "_id",
        foreignField: "_id",
        as: "resource"
      }
    },
    { $unwind: "$resource" }
  ];

  if (searchMatch) basePipeline.push(searchMatch);

  const countPipeline = [...basePipeline, { $count: "total" }];
  const countResult = await Order.aggregate(countPipeline);
  const totalItems = countResult[0]?.total || 0;

  const skip = (page - 1) * limit;

  const finalPipeline = [
    ...basePipeline,
    {
      $project: {
        productId: "$resource.productId",
        quantity: 1,
        amount: 1,
        _id: 0
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const data = await Order.aggregate(finalPipeline);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
};



