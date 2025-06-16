import User from "../../auth/auth.model.js";
import Order from "../../Payment/order.model.js";
import Resource from "../../resource/resource.model.js";


export const getAdminDashboardSummaryService = async (adminId) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // ---------- Total Revenue ----------
    const totalRevenueAgg = await Order.aggregate([
        { $unwind: "$items" },
        { $match: { paymentStatus: "paid" } },
        {
        $group: {
            _id: null,
            totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        }
    ]);

    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;


    // ---------- Admin Own Revenue ----------
    const ownRevenueAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
        $match: {
            paymentStatus: "paid",
            "items.seller": adminId
        }
        },
        {
        $group: {
            _id: null,
            ownRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] }
            }
        }
        }
    ]);

    const ownRevenue = ownRevenueAgg[0]?.ownRevenue || 0;

    // ---------- Live Products ----------
    const liveProducts = await Resource.countDocuments({ status: "approved" });

    // ---------- Total Sellers ----------
    const totalSellers = await User.countDocuments({ role: "SELLER" });

    // ---------- Total Users ----------
    const totalUsers = await User.countDocuments({ role: "USER" });

    // ---------- Product Sell by Practice Area (All Sellers) ----------
    const productSellAgg = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
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



    // ---------- New Products ----------
    const startOfDay = new Date(currentYear, now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const startOfYear = new Date(currentYear, 0, 1);

    const countProducts = async (start) => {
        return await Resource.countDocuments({
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
        ownRevenue,
        liveProducts,
        totalSellers,
        totalUsers,
        newProducts,
        productSell
    };
};



export const getAdminOwnRevenueReportService = async (adminId, filter = "month") => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate;
    let unit;
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
            "items.seller": adminId,
            paymentStatus: "paid",
            createdAt: { $gte: startDate }
        }
        },
        {
        $group: {
            _id: { date: { $dateToString: { format, date: "$createdAt" } } },
            total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
        },
        { $sort: { "_id.date": 1 } }
    ]);

    const aggMap = new Map(agg.map(i => [i._id.date, Math.round(i.total)]));

    let final;
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



export const getTotalRevenueReportService = async (filter = "month") => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate;
    let unit;
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

    const aggMap = new Map(agg.map(i => [i._id.date, Math.round(i.total)]));

    let final;
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



export const getAdminSalesHistoryService = async (adminId, search) => {
  const sales = await Order.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        "items.seller": adminId,
        paymentStatus: "paid"
      }
    },
    {
      $group: {
        _id: "$items.resource",
        quantity: { $sum: "$items.quantity" },
        amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
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
    { $unwind: "$resource" },

    // Optional search filter
    ...(search
      ? [{
          $match: {
            "resource.productId": { $regex: search, $options: "i" }
          }
        }]
      : []),

    {
      $project: {
        productId: "$resource.productId",
        quantity: 1,
        amount: 1,
        _id: 0
      }
    },
    { $sort: { productId: -1 } }
  ]);

  return sales;
};


export const getRevenueFromSellerService = async () => {
  const revenue = await Order.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        paymentStatus: "paid"
      }
    },
    {
      $group: {
        _id: {
          seller: "$items.seller",
          resource: "$items.resource"
        },
        amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      }
    },
    {
      $project: {
        sellerId: "$_id.seller",
        resourceId: "$_id.resource",
        revenueFromSeller: { $divide: ["$amount", 2] },
        _id: 0
      }
    },
    // Join with User model to get seller info
    {
      $lookup: {
        from: "users",
        localField: "sellerId",
        foreignField: "_id",
        as: "sellerInfo"
      }
    },
    { $unwind: "$sellerInfo" },
    {
      $match: {
        "sellerInfo.role": "SELLER"
      }
    },
    // Join with Resource model to get product info
    {
      $lookup: {
        from: "resources",
        localField: "resourceId",
        foreignField: "_id",
        as: "resourceInfo"
      }
    },
    { $unwind: "$resourceInfo" },
    {
      $project: {
        sellerId: 1,
        sellerName: "$sellerInfo.name",
        productId: "$resourceInfo.productId",
        revenueFromSeller: 1
      }
    },
    { $sort: { sellerName: 1 } }
  ]);

  return revenue;
};


