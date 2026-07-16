CREATE TABLE IF NOT EXISTS `interview_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `meetingUrl` text NOT NULL,
  `googleEventId` varchar(255) DEFAULT NULL,
  `interviewerName` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `calendarSyncStatus` enum('synced','failed') NOT NULL DEFAULT 'synced',
  `calendarSyncError` text DEFAULT NULL,
  `createdByAdminId` int DEFAULT NULL,
  `status` enum('scheduled','completed','absent','cancelled') NOT NULL DEFAULT 'scheduled',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `google_calendar_connections` (
  `id` int NOT NULL,
  `encryptedRefreshToken` text NOT NULL,
  `connectedByAdminId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `interview_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slotId` int NOT NULL,
  `candidateId` int NOT NULL,
  `bookedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `communicationScore` int DEFAULT NULL,
  `motivationScore` int DEFAULT NULL,
  `leadershipScore` int DEFAULT NULL,
  `recommendation` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `evaluationNotes` text DEFAULT NULL,
  `evaluatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interview_bookings_slot_unique` (`slotId`),
  UNIQUE KEY `interview_bookings_candidate_unique` (`candidateId`)
);

CREATE TABLE IF NOT EXISTS `interview_reminder_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `reminderType` enum('24h','1h') NOT NULL,
  `email` varchar(320) NOT NULL,
  `status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `errorMessage` text DEFAULT NULL,
  `attemptCount` int NOT NULL DEFAULT 0,
  `nextAttemptAt` timestamp NULL DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interview_reminder_booking_type_unique` (`bookingId`,`reminderType`)
);
