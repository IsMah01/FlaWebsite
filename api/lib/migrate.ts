import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { env } from "./env";

async function hasColumn(connection: mysql.Connection, table: string, column: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function addColumnIfMissing(
  connection: mysql.Connection,
  table: string,
  column: string,
  definition: string,
) {
  if (!(await hasColumn(connection, table, column))) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export async function ensureDatabaseSchema() {
  const connection = await mysql.createConnection(env.databaseUrl);

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS new_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        studyStatus ENUM('student','graduated','master_student','phd_student','other') NOT NULL,
        attestationUrl TEXT NULL,
        \`الوثائق\` TEXT NULL,
        phoneNumber VARCHAR(50) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        isAmbassador BOOLEAN NOT NULL DEFAULT false,
        password VARCHAR(255) NOT NULL,
        emailConfirmed BOOLEAN NOT NULL DEFAULT false,
        confirmationToken VARCHAR(255) NULL,
        passwordResetToken VARCHAR(64) NULL,
        passwordResetExpiresAt TIMESTAMP NULL,
        newsletterConsent BOOLEAN NOT NULL DEFAULT false,
        questionnaireDraft TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastLoginAt TIMESTAMP NULL
      )
    `);

    await addColumnIfMissing(connection, "new_users", "questionnaireDraft", "questionnaireDraft TEXT NULL");
    await addColumnIfMissing(connection, "new_users", "passwordResetToken", "passwordResetToken VARCHAR(64) NULL");
    await addColumnIfMissing(connection, "new_users", "passwordResetExpiresAt", "passwordResetExpiresAt TIMESTAMP NULL");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unionId VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NULL,
        email VARCHAR(320) NULL,
        avatar TEXT NULL,
        role ENUM('user','admin') NOT NULL DEFAULT 'user',
        status ENUM('candidate','ambassador','user','admin') NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignInAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        newUserId INT NULL UNIQUE,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        studyStatus ENUM('student','graduated','master_student','phd_student','other') NOT NULL,
        attestationUrl TEXT NULL,
        idCardUrl TEXT NULL,
        phoneNumber VARCHAR(50) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        isAmbassador BOOLEAN NOT NULL DEFAULT false,
        password VARCHAR(255) NOT NULL,
        emailConfirmed BOOLEAN NOT NULL DEFAULT false,
        confirmationToken VARCHAR(255) NULL,
        passwordResetToken VARCHAR(64) NULL,
        passwordResetExpiresAt TIMESTAMP NULL,
        newsletterConsent BOOLEAN NOT NULL DEFAULT false,
        applicationStatus ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        finalAdmissionStatus ENUM('pending','admitted','not_admitted_after_interview') NOT NULL DEFAULT 'pending',
        finalAdmissionEmailSentAt TIMESTAMP NULL,
        finalAdmissionEmailError TEXT NULL,
        questionnaireAnswers TEXT NULL,
        submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        adminNote TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await addColumnIfMissing(connection, "candidates", "newUserId", "newUserId INT NULL UNIQUE");
    await addColumnIfMissing(connection, "candidates", "attestationUrl", "attestationUrl TEXT NULL");
    await addColumnIfMissing(connection, "candidates", "idCardUrl", "idCardUrl TEXT NULL");
    await addColumnIfMissing(connection, "candidates", "password", "password VARCHAR(255) NULL");
    await addColumnIfMissing(connection, "candidates", "passwordResetToken", "passwordResetToken VARCHAR(64) NULL");
    await addColumnIfMissing(connection, "candidates", "passwordResetExpiresAt", "passwordResetExpiresAt TIMESTAMP NULL");
    await addColumnIfMissing(connection, "candidates", "questionnaireAnswers", "questionnaireAnswers TEXT NULL");
    await addColumnIfMissing(connection, "candidates", "submittedAt", "submittedAt TIMESTAMP NULL");
    await addColumnIfMissing(connection, "candidates", "finalAdmissionStatus", "finalAdmissionStatus ENUM('pending','admitted','not_admitted_after_interview') NOT NULL DEFAULT 'pending'");
    await addColumnIfMissing(connection, "candidates", "finalAdmissionEmailSentAt", "finalAdmissionEmailSentAt TIMESTAMP NULL");
    await addColumnIfMissing(connection, "candidates", "finalAdmissionEmailError", "finalAdmissionEmailError TEXT NULL");
    if (await hasColumn(connection, "candidates", "passwordHash")) {
      await connection.query("ALTER TABLE candidates MODIFY COLUMN passwordHash VARCHAR(255) NULL");
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS final_candidate_confirmations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        newUserId INT NULL,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(50) NOT NULL DEFAULT '',
        status ENUM('pending_email','confirmed','removed') NOT NULL DEFAULT 'pending_email',
        confirmedAt TIMESTAMP NULL,
        removedAt TIMESTAMP NULL,
        removedByAdminId INT NULL,
        profileImageFile VARCHAR(255) NULL,
        profileDescription VARCHAR(500) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX final_candidate_confirmations_status_index (status),
        INDEX final_candidate_confirmations_new_user_index (newUserId)
      )
    `);
    await addColumnIfMissing(connection, "final_candidate_confirmations", "profileImageFile", "profileImageFile VARCHAR(255) NULL");
    await addColumnIfMissing(connection, "final_candidate_confirmations", "profileDescription", "profileDescription VARCHAR(500) NULL");

    await connection.query(`CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY, scheduleKey VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(500) NOT NULL, dayNumber INT NOT NULL, timeLabel VARCHAR(50) NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE, isOpen BOOLEAN NOT NULL DEFAULT false,
      openedAt TIMESTAMP NULL, closedAt TIMESTAMP NULL, createdByAdminId INT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    await addColumnIfMissing(connection, "attendance_sessions", "startsAt", "startsAt DATETIME NULL");
    await connection.query(`UPDATE attendance_sessions SET startsAt=DATE_SUB(STR_TO_DATE(CONCAT('2026-08-',LPAD(13+dayNumber,2,'0'),' ',LEFT(timeLabel,5)),'%Y-%m-%d %H:%i'),INTERVAL 1 HOUR) WHERE startsAt IS NULL`);
    await connection.query(`CREATE TABLE IF NOT EXISTS attendance_records (
      id INT AUTO_INCREMENT PRIMARY KEY, sessionId INT NOT NULL, finalCandidateId INT NOT NULL,
      checkedInAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY attendance_session_candidate_unique (sessionId, finalCandidateId),
      INDEX attendance_session_index (sessionId), INDEX attendance_candidate_index (finalCandidateId)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY, sessionId INT NOT NULL,
      finalCandidateId INT NULL, adminId INT NOT NULL,
      action ENUM('open','close','manual_add','manual_remove') NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX attendance_audit_session_index (sessionId),
      INDEX attendance_audit_admin_index (adminId)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS candidate_point_entries (
      id INT AUTO_INCREMENT PRIMARY KEY, finalCandidateId INT NOT NULL,
      sourceKey VARCHAR(160) NOT NULL, actionType VARCHAR(60) NOT NULL,
      points INT NOT NULL, title VARCHAR(500) NOT NULL, detail VARCHAR(500) NULL,
      awardedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY candidate_point_source_unique (finalCandidateId, sourceKey),
      INDEX candidate_point_candidate_index (finalCandidateId),
      INDEX candidate_point_awarded_index (awardedAt)
    )`);
    await addColumnIfMissing(connection, "candidate_point_entries", "awardedByAdminId", "awardedByAdminId INT NULL");
    await connection.query(`DELETE p FROM candidate_point_entries p
      JOIN attendance_records r ON p.finalCandidateId=r.finalCandidateId
        AND p.sourceKey IN (CONCAT('attendance:',r.sessionId),CONCAT('punctuality:',r.sessionId))
      WHERE p.awardedByAdminId IS NULL AND p.detail<>'حضور أضيف من طرف الإدارة'`);
    await connection.query(`INSERT IGNORE INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt)
      SELECT r.finalCandidateId,CONCAT('attendance:',r.sessionId),'attendance',5,s.title,'نقاط الوصول في الوقت المسموح',r.checkedInAt
      FROM attendance_records r JOIN attendance_sessions s ON s.id=r.sessionId
      WHERE s.startsAt IS NOT NULL AND r.checkedInAt BETWEEN DATE_SUB(s.startsAt,INTERVAL 15 MINUTE) AND DATE_ADD(s.startsAt,INTERVAL 10 MINUTE)`);
    await connection.query(`INSERT IGNORE INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt)
      SELECT r.finalCandidateId,CONCAT('punctuality:',r.sessionId),'punctuality',5,s.title,'مكافأة الوصول خلال 15 دقيقة قبل البداية',r.checkedInAt
      FROM attendance_records r JOIN attendance_sessions s ON s.id=r.sessionId
      WHERE s.startsAt IS NOT NULL AND r.checkedInAt>=DATE_SUB(s.startsAt,INTERVAL 15 MINUTE) AND r.checkedInAt<s.startsAt`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS editions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        editionNumber INT NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        dateRange VARCHAR(255) NULL,
        eventDate VARCHAR(255) NULL,
        eventTime VARCHAR(255) NULL,
        location VARCHAR(255) NULL,
        speakers TEXT NULL,
        guests TEXT NULL,
        conferences TEXT NULL,
        activities TEXT NULL,
        videoUrl TEXT NULL,
        coverImage TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const [column, definition] of [
      ["dateRange", "dateRange VARCHAR(255) NULL"],
      ["eventTime", "eventTime VARCHAR(255) NULL"],
      ["speakers", "speakers TEXT NULL"],
      ["guests", "guests TEXT NULL"],
      ["conferences", "conferences TEXT NULL"],
      ["activities", "activities TEXT NULL"],
      ["videoUrl", "videoUrl TEXT NULL"],
    ]) {
      await addColumnIfMissing(connection, "editions", column, definition);
    }

    await connection.execute(
      `INSERT INTO editions
         (editionNumber, title, description, dateRange, eventDate, location, coverImage)
       VALUES (18, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         dateRange = VALUES(dateRange),
         eventDate = VALUES(eventDate),
         location = VALUES(location),
         coverImage = COALESCE(coverImage, VALUES(coverImage))`,
      [
        "الدورة الثامنة عشرة - دورة الأثر",
        "الدورة الثامنة عشرة لأكاديمية أطر الغد، دورة الأثر، تجربة فكرية وتكوينية تجمع الشباب حول التعلم والقيادة والعمل الجماعي وصناعة أثر مستدام.",
        "غشت 2026",
        "ابتداءً من 14 غشت 2026",
        "الرباط، المغرب",
        "/images/edition-18-logo.jpeg",
      ],
    );

    await connection.query(`
      CREATE TABLE IF NOT EXISTS edition_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        editionId INT NOT NULL,
        imageUrl TEXT NOT NULL,
        caption VARCHAR(255) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL,
        phone VARCHAR(50) NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        name VARCHAR(255) NULL,
        isSubscribed BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ambassador_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        authorName VARCHAR(255) NOT NULL,
        authorType ENUM('ambassador','admin') NOT NULL,
        authorCandidateId INT NULL,
        authorAdminId INT NULL,
        message TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        passwordResetToken VARCHAR(64) NULL,
        passwordResetExpiresAt TIMESTAMP NULL,
        role ENUM('admin','super_admin','interview_admin') NOT NULL DEFAULT 'admin',
        isActive BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        startTime TIMESTAMP NOT NULL,
        endTime TIMESTAMP NOT NULL,
        meetingUrl TEXT NOT NULL,
        googleEventId VARCHAR(255) NULL,
        interviewerName VARCHAR(255) NULL,
        notes TEXT NULL,
        calendarSyncStatus ENUM('synced','failed') NOT NULL DEFAULT 'synced',
        calendarSyncError TEXT NULL,
        createdByAdminId INT NULL,
        status ENUM('scheduled','completed','absent','cancelled') NOT NULL DEFAULT 'scheduled',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await addColumnIfMissing(connection, "admin_users", "profileImageRef", "profileImageRef TEXT NULL");
    await addColumnIfMissing(connection, "admin_users", "profileDescription", "profileDescription TEXT NULL");
    await addColumnIfMissing(connection, "admin_users", "phoneNumber", "phoneNumber VARCHAR(50) NULL");
    await addColumnIfMissing(connection, "interview_slots", "googleEventId", "googleEventId VARCHAR(255) NULL");
    await addColumnIfMissing(connection, "interview_slots", "calendarSyncStatus", "calendarSyncStatus ENUM('synced','failed') NOT NULL DEFAULT 'synced'");
    await addColumnIfMissing(connection, "interview_slots", "calendarSyncError", "calendarSyncError TEXT NULL");
    await addColumnIfMissing(connection, "interview_slots", "createdByAdminId", "createdByAdminId INT NULL");
    await connection.query(
      "ALTER TABLE admin_users MODIFY COLUMN role ENUM('admin','super_admin','interview_admin') NOT NULL DEFAULT 'admin'",
    );
    await connection.query(
      "ALTER TABLE interview_slots MODIFY COLUMN status ENUM('active','scheduled','completed','absent','cancelled') NOT NULL DEFAULT 'scheduled'",
    );
    await connection.query("UPDATE interview_slots SET status = 'scheduled' WHERE status = 'active'");
    await connection.query(
      "ALTER TABLE interview_slots MODIFY COLUMN status ENUM('scheduled','completed','absent','cancelled') NOT NULL DEFAULT 'scheduled'",
    );

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slotId INT NOT NULL,
        candidateId INT NOT NULL,
        bookedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY interview_bookings_slot_unique (slotId),
        UNIQUE KEY interview_bookings_candidate_unique (candidateId)
      )
    `);
    await addColumnIfMissing(connection, "interview_bookings", "communicationScore", "communicationScore INT NULL");
    await addColumnIfMissing(connection, "interview_bookings", "motivationScore", "motivationScore INT NULL");
    await addColumnIfMissing(connection, "interview_bookings", "leadershipScore", "leadershipScore INT NULL");
    await addColumnIfMissing(connection, "interview_bookings", "recommendation", "recommendation ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending'");
    await addColumnIfMissing(connection, "interview_bookings", "evaluationNotes", "evaluationNotes TEXT NULL");
    await addColumnIfMissing(connection, "interview_bookings", "evaluatedAt", "evaluatedAt TIMESTAMP NULL");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_candidate_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidateId INT NOT NULL,
        adminId INT NOT NULL,
        assignedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY interview_candidate_assignments_candidate_unique (candidateId),
        INDEX interview_candidate_assignments_admin_index (adminId)
      )
    `);
    await connection.query(`
      INSERT IGNORE INTO interview_candidate_assignments (candidateId, adminId)
      SELECT bookings.candidateId, slots.createdByAdminId
      FROM interview_bookings bookings
      INNER JOIN interview_slots slots ON slots.id = bookings.slotId
      INNER JOIN admin_users admins ON admins.id = slots.createdByAdminId
      WHERE slots.createdByAdminId IS NOT NULL
        AND admins.role = 'interview_admin'
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actorAdminId INT NOT NULL,
        action VARCHAR(80) NOT NULL,
        candidateId INT NULL,
        targetAdminId INT NULL,
        slotId INT NULL,
        details TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX interview_audit_actor_index (actorAdminId),
        INDEX interview_audit_created_index (createdAt)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_transfer_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slotId INT NOT NULL,
        candidateId INT NOT NULL,
        fromAdminId INT NOT NULL,
        toAdminId INT NOT NULL,
        status ENUM('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
        responseNote VARCHAR(1000) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        respondedAt TIMESTAMP NULL,
        INDEX interview_transfer_slot_index (slotId),
        INDEX interview_transfer_from_status_index (fromAdminId, status),
        INDEX interview_transfer_to_status_index (toAdminId, status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_reminder_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bookingId INT NOT NULL,
        reminderType ENUM('24h','1h') NOT NULL,
        email VARCHAR(320) NOT NULL,
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        attemptCount INT NOT NULL DEFAULT 0,
        nextAttemptAt TIMESTAMP NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY interview_reminder_booking_type_unique (bookingId, reminderType),
        INDEX interview_reminder_status_idx (status)
      )
    `);
    await addColumnIfMissing(connection, "interview_reminder_emails", "attemptCount", "attemptCount INT NOT NULL DEFAULT 0");
    await addColumnIfMissing(connection, "interview_reminder_emails", "nextAttemptAt", "nextAttemptAt TIMESTAMP NULL");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_booking_reminder_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidateId INT NOT NULL,
        email VARCHAR(320) NOT NULL,
        reminderDate CHAR(10) NOT NULL,
        reminderHour ENUM('10','18') NOT NULL,
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY interview_booking_reminder_run_unique (candidateId, reminderDate, reminderHour),
        INDEX interview_booking_reminder_status_idx (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_admin_slot_reminder_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adminId INT NOT NULL,
        email VARCHAR(320) NOT NULL,
        reminderDate CHAR(10) NOT NULL,
        reminderHour ENUM('10','18') NOT NULL,
        unbookedCount INT NOT NULL,
        emptySlotCount INT NOT NULL,
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY interview_admin_slot_reminder_run_unique (adminId, reminderDate, reminderHour),
        INDEX interview_admin_slot_reminder_status_idx (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidate_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL,
        phoneNumber VARCHAR(50) NOT NULL DEFAULT '',
        tokenHash VARCHAR(64) NOT NULL,
        status ENUM('pending','activated','revoked') NOT NULL DEFAULT 'pending',
        expiresAt TIMESTAMP NOT NULL,
        invitedByAdminId INT NOT NULL,
        emailSentAt TIMESTAMP NULL,
        emailError TEXT NULL,
        resendCount INT NOT NULL DEFAULT 0,
        activatedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY candidate_invitations_email_unique (email),
        UNIQUE KEY candidate_invitations_token_unique (tokenHash),
        INDEX candidate_invitations_status_idx (status),
        INDEX candidate_invitations_expiry_idx (expiresAt)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS google_calendar_connections (
        id INT PRIMARY KEY,
        encryptedRefreshToken TEXT NOT NULL,
        connectedByAdminId INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_buckets (
        bucketKey CHAR(64) NOT NULL,
        windowStart BIGINT UNSIGNED NOT NULL,
        expiresAt BIGINT UNSIGNED NOT NULL,
        hitCount INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (bucketKey, windowStart),
        INDEX rate_limit_expires_idx (expiresAt)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidate_reminder_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        newUserId INT NOT NULL,
        email VARCHAR(320) NOT NULL,
        reminderDate CHAR(10) NOT NULL,
        daysLeft INT NOT NULL,
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY candidate_reminder_daily_unique (newUserId, reminderDate),
        INDEX candidate_reminder_date_idx (reminderDate),
        INDEX candidate_reminder_status_idx (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidate_confirmation_reminder_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        newUserId INT NOT NULL,
        email VARCHAR(320) NOT NULL,
        reminderDate CHAR(10) NOT NULL,
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY candidate_confirmation_reminder_daily_unique (newUserId, reminderDate),
        INDEX candidate_confirmation_reminder_date_idx (reminderDate),
        INDEX candidate_confirmation_reminder_status_idx (status)
      )
    `);

    await addColumnIfMissing(connection, "admin_users", "updatedAt", "updatedAt TIMESTAMP NULL");
    await addColumnIfMissing(connection, "admin_users", "passwordResetToken", "passwordResetToken VARCHAR(64) NULL");
    await addColumnIfMissing(connection, "admin_users", "passwordResetExpiresAt", "passwordResetExpiresAt TIMESTAMP NULL");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Admin";
    const [adminRows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM admin_users WHERE email = ? LIMIT 1",
      [adminEmail],
    );
    if (adminRows.length === 0) {
      if (!adminPassword || !/^(?=.*[A-Z]).{8,}$/.test(adminPassword)) {
        throw new Error(
          "ADMIN_PASSWORD must contain at least 8 characters and one uppercase letter",
        );
      }
      await connection.execute(
        "INSERT INTO admin_users (name, email, passwordHash, role, isActive) VALUES (?, ?, ?, 'super_admin', true)",
        [
          adminName,
          adminEmail,
          await bcrypt.hash(adminPassword, 12),
        ],
      );
    } else {
      // The account selected through server configuration is the owner account.
      // Upgrade legacy installations where it predates the super_admin role.
      await connection.execute(
        "UPDATE admin_users SET role = 'super_admin' WHERE id = ? AND role = 'admin'",
        [adminRows[0].id],
      );
    }

    console.log("[db] Schema is ready.");
  } finally {
    await connection.end();
  }
}
