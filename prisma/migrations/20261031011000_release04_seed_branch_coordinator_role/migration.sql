-- RELEASE-04 additive seed, deliberately separate from ADD VALUE for PostgreSQL enum commit safety.
-- Do not update IL_KOORDINATORU users, historical CompensationRule/CompensationEntry or payments.
INSERT INTO "Role" ("code", "name", "description", "permissions")
VALUES ('BRANS_KOORDINATORU', 'Branş Koordinatörü',
        'Bölge Koordinatörü veya Genel Koordinatör tarafından bölge ve branş kapsamı atanır.',
        ARRAY[]::TEXT[])
ON CONFLICT ("code") DO NOTHING;
