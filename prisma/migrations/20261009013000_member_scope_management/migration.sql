CREATE TYPE "MembershipApplicationStatus" AS ENUM ('ALINDI','INCELEMEDE','UYGUN','ONAYLANDI','REDDEDILDI');

CREATE TABLE "UserBranchAssignment" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBranchAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserBranchAssignment_userId_branchId_key" ON "UserBranchAssignment"("userId","branchId");
CREATE INDEX "UserBranchAssignment_userId_idx" ON "UserBranchAssignment"("userId");
CREATE INDEX "UserBranchAssignment_branchId_idx" ON "UserBranchAssignment"("branchId");
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserBranchAssignment" ("userId","branchId")
SELECT "id","editorBranchId" FROM "User" WHERE "editorBranchId" IS NOT NULL
ON CONFLICT ("userId","branchId") DO NOTHING;

INSERT INTO "Province" ("id","code","name","region") VALUES
  (1, '01', 'Adana', 'Akdeniz'),
  (2, '02', 'Adıyaman', 'Güneydoğu Anadolu'),
  (3, '03', 'Afyonkarahisar', 'Ege'),
  (4, '04', 'Ağrı', 'Doğu Anadolu'),
  (5, '05', 'Amasya', 'Karadeniz'),
  (6, '06', 'Ankara', 'İç Anadolu'),
  (7, '07', 'Antalya', 'Akdeniz'),
  (8, '08', 'Artvin', 'Karadeniz'),
  (9, '09', 'Aydın', 'Ege'),
  (10, '10', 'Balıkesir', 'Marmara'),
  (11, '11', 'Bilecik', 'Marmara'),
  (12, '12', 'Bingöl', 'Doğu Anadolu'),
  (13, '13', 'Bitlis', 'Doğu Anadolu'),
  (14, '14', 'Bolu', 'Karadeniz'),
  (15, '15', 'Burdur', 'Akdeniz'),
  (16, '16', 'Bursa', 'Marmara'),
  (17, '17', 'Çanakkale', 'Marmara'),
  (18, '18', 'Çankırı', 'İç Anadolu'),
  (19, '19', 'Çorum', 'Karadeniz'),
  (20, '20', 'Denizli', 'Ege'),
  (21, '21', 'Diyarbakır', 'Güneydoğu Anadolu'),
  (22, '22', 'Edirne', 'Marmara'),
  (23, '23', 'Elazığ', 'Doğu Anadolu'),
  (24, '24', 'Erzincan', 'Doğu Anadolu'),
  (25, '25', 'Erzurum', 'Doğu Anadolu'),
  (26, '26', 'Eskişehir', 'İç Anadolu'),
  (27, '27', 'Gaziantep', 'Güneydoğu Anadolu'),
  (28, '28', 'Giresun', 'Karadeniz'),
  (29, '29', 'Gümüşhane', 'Karadeniz'),
  (30, '30', 'Hakkâri', 'Doğu Anadolu'),
  (31, '31', 'Hatay', 'Akdeniz'),
  (32, '32', 'Isparta', 'Akdeniz'),
  (33, '33', 'Mersin', 'Akdeniz'),
  (34, '34', 'İstanbul', 'Marmara'),
  (35, '35', 'İzmir', 'Ege'),
  (36, '36', 'Kars', 'Doğu Anadolu'),
  (37, '37', 'Kastamonu', 'Karadeniz'),
  (38, '38', 'Kayseri', 'İç Anadolu'),
  (39, '39', 'Kırklareli', 'Marmara'),
  (40, '40', 'Kırşehir', 'İç Anadolu'),
  (41, '41', 'Kocaeli', 'Marmara'),
  (42, '42', 'Konya', 'İç Anadolu'),
  (43, '43', 'Kütahya', 'Ege'),
  (44, '44', 'Malatya', 'Doğu Anadolu'),
  (45, '45', 'Manisa', 'Ege'),
  (46, '46', 'Kahramanmaraş', 'Akdeniz'),
  (47, '47', 'Mardin', 'Güneydoğu Anadolu'),
  (48, '48', 'Muğla', 'Ege'),
  (49, '49', 'Muş', 'Doğu Anadolu'),
  (50, '50', 'Nevşehir', 'İç Anadolu'),
  (51, '51', 'Niğde', 'İç Anadolu'),
  (52, '52', 'Ordu', 'Karadeniz'),
  (53, '53', 'Rize', 'Karadeniz'),
  (54, '54', 'Sakarya', 'Marmara'),
  (55, '55', 'Samsun', 'Karadeniz'),
  (56, '56', 'Siirt', 'Güneydoğu Anadolu'),
  (57, '57', 'Sinop', 'Karadeniz'),
  (58, '58', 'Sivas', 'İç Anadolu'),
  (59, '59', 'Tekirdağ', 'Marmara'),
  (60, '60', 'Tokat', 'Karadeniz'),
  (61, '61', 'Trabzon', 'Karadeniz'),
  (62, '62', 'Tunceli', 'Doğu Anadolu'),
  (63, '63', 'Şanlıurfa', 'Güneydoğu Anadolu'),
  (64, '64', 'Uşak', 'Ege'),
  (65, '65', 'Van', 'Doğu Anadolu'),
  (66, '66', 'Yozgat', 'İç Anadolu'),
  (67, '67', 'Zonguldak', 'Karadeniz'),
  (68, '68', 'Aksaray', 'İç Anadolu'),
  (69, '69', 'Bayburt', 'Karadeniz'),
  (70, '70', 'Karaman', 'İç Anadolu'),
  (71, '71', 'Kırıkkale', 'İç Anadolu'),
  (72, '72', 'Batman', 'Güneydoğu Anadolu'),
  (73, '73', 'Şırnak', 'Güneydoğu Anadolu'),
  (74, '74', 'Bartın', 'Karadeniz'),
  (75, '75', 'Ardahan', 'Doğu Anadolu'),
  (76, '76', 'Iğdır', 'Doğu Anadolu'),
  (77, '77', 'Yalova', 'Marmara'),
  (78, '78', 'Karabük', 'Karadeniz'),
  (79, '79', 'Kilis', 'Güneydoğu Anadolu'),
  (80, '80', 'Osmaniye', 'Akdeniz'),
  (81, '81', 'Düzce', 'Karadeniz')
ON CONFLICT ("id") DO UPDATE SET "code"=EXCLUDED."code","name"=EXCLUDED."name","region"=EXCLUDED."region";

CREATE TABLE "MembershipApplication" (
  "id" SERIAL NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "provinceId" INTEGER NOT NULL,
  "districtName" TEXT,
  "institutionName" TEXT,
  "requestedRole" TEXT,
  "requestedBranch" TEXT,
  "motivation" TEXT,
  "status" "MembershipApplicationStatus" NOT NULL DEFAULT 'ALINDI',
  "reviewNote" TEXT,
  "reviewedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MembershipApplication_email_idx" ON "MembershipApplication"("email");
CREATE INDEX "MembershipApplication_provinceId_idx" ON "MembershipApplication"("provinceId");
CREATE INDEX "MembershipApplication_status_idx" ON "MembershipApplication"("status");
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
