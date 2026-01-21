
// controllers/profile.controller.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// PATCH /api/profile/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "newPassword must be at least 8 characters" });
    }

    // If your User schema has password with select:false, you must select it here:
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Optional: rotate token (not necessary unless you want immediate token refresh)
    // const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    // return res.status(200).json({ message: 'Password updated', token });

    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
