CREATE TABLE IF NOT EXISTS `interview_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actorAdminId` int NOT NULL,
  `action` varchar(80) NOT NULL,
  `candidateId` int DEFAULT NULL,
  `targetAdminId` int DEFAULT NULL,
  `slotId` int DEFAULT NULL,
  `details` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `interview_audit_actor_index` (`actorAdminId`),
  KEY `interview_audit_created_index` (`createdAt`)
);
