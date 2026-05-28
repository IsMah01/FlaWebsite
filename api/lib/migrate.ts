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
        \`Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚\` TEXT NULL,
        phoneNumber VARCHAR(50) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        isAmbassador BOOLEAN NOT NULL DEFAULT false,
        password VARCHAR(255) NOT NULL,
        emailConfirmed BOOLEAN NOT NULL DEFAULT false,
        confirmationToken VARCHAR(255) NULL,
        newsletterConsent BOOLEAN NOT NULL DEFAULT false,
        questionnaireDraft TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastLoginAt TIMESTAMP NULL
      )
    `);

    await addColumnIfMissing(connection, "new_users", "questionnaireDraft", "questionnaireDraft TEXT NULL");

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
        newsletterConsent BOOLEAN NOT NULL DEFAULT false,
        applicationStatus ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
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
    await addColumnIfMissing(connection, "candidates", "questionnaireAnswers", "questionnaireAnswers TEXT NULL");
    await addColumnIfMissing(connection, "candidates", "submittedAt", "submittedAt TIMESTAMP NULL");
    if (await hasColumn(connection, "candidates", "passwordHash")) {
      await connection.query("ALTER TABLE candidates MODIFY COLUMN passwordHash VARCHAR(255) NULL");
    }

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
        role ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
        isActive BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await addColumnIfMissing(connection, "admin_users", "updatedAt", "updatedAt TIMESTAMP NULL");

    const [adminRows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM admin_users WHERE email = ? LIMIT 1",
      [process.env.ADMIN_EMAIL || "admin@example.com"],
    );
    if (adminRows.length === 0) {
      await connection.execute(
        "INSERT INTO admin_users (name, email, passwordHash, role, isActive) VALUES (?, ?, ?, 'super_admin', true)",
        [
          process.env.ADMIN_NAME || "Admin",
          process.env.ADMIN_EMAIL || "admin@example.com",
          await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12),
        ],
      );
    }

    console.log("[db] Schema is ready.");
  } finally {
    await connection.end();
  }
}
