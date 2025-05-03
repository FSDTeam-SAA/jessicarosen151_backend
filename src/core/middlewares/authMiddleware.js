import jwt from 'jsonwebtoken';
import {accessTokenSecrete} from '../../core/config/config.js';
import RoleType from '../../lib/types.js';


const userMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, auth denied' });

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = decoded;

    if (req.user.role !== RoleType.USER) {
      return res.status(403).json({ message: 'Admin access only' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};


const adminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(token );
  
  if (!token) return res.status(401).json({ message: 'No token, auth denied' });

  try {
    console.log(accessTokenSecrete)
    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = decoded;

    if (req.user.role !== RoleType.ADMIN) {
      return res.status(403).json({ message: 'Admin access only' });
    }

    next();
  } catch (err) {
    console.log(err);
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};


const sellerMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, auth denied' });

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = decoded;

    if (req.user.role !== RoleType.SELLER) {
      return res.status(403).json({ message: 'Seller access only' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminSellerMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, auth denied' });

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = decoded;
    if (req.user.role !== RoleType.ADMIN && req.user.role !== RoleType.SELLER) {
      return res.status(403).json({ message: 'Admin or Seller access only' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const userAdminSellerMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, auth denied' });

  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = decoded;

    if (
      req.user.role !== RoleType.USER ||
      req.user.role !== RoleType.ADMIN ||
      req.user.role !== RoleType.SELLER
    ) {
      return res.status(403).json({ message: 'User, Admin or Seller access only' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export{ userMiddleware, adminMiddleware, sellerMiddleware, adminSellerMiddleware, userAdminSellerMiddleware };

