CREATE TABLE IF NOT EXISTS `interview_candidate_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `candidateId` int NOT NULL,
  `adminId` int NOT NULL,
  `assignedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interview_candidate_assignments_candidate_unique` (`candidateId`),
  KEY `interview_candidate_assignments_admin_index` (`adminId`)
);

INSERT IGNORE INTO `interview_candidate_assignments` (`candidateId`, `adminId`)
SELECT bookings.`candidateId`, slots.`createdByAdminId`
FROM `interview_bookings` bookings
INNER JOIN `interview_slots` slots ON slots.`id` = bookings.`slotId`
INNER JOIN `admin_users` admins ON admins.`id` = slots.`createdByAdminId`
WHERE slots.`createdByAdminId` IS NOT NULL
  AND admins.`role` = 'interview_admin';
