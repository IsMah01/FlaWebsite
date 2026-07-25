ALTER TABLE `admin_users`
  ADD COLUMN IF NOT EXISTS `phoneNumber` varchar(50) DEFAULT NULL AFTER `email`;
