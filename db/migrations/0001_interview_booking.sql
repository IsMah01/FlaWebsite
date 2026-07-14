CREATE TABLE IF NOT EXISTS `interview_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `meetingUrl` text NOT NULL,
  `interviewerName` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','cancelled') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `interview_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slotId` int NOT NULL,
  `candidateId` int NOT NULL,
  `bookedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interview_bookings_slot_unique` (`slotId`),
  UNIQUE KEY `interview_bookings_candidate_unique` (`candidateId`)
);
