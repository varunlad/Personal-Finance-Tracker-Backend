module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, access denied" });
  }
console.log("authHeader",authHeader)
  const token = authHeader.split(" ")[1];
console.log("token",token)
  try {
    const decoded = jwt.verify(token, 'mySecretKey123');
    console.log("decoded", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", err });
  }
};
