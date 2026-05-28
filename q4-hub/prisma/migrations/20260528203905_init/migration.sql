-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('PRINCIPAL', 'TRANSVERSAL');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PAGADO', 'PENDIENTE', 'NULO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFERENCIA', 'CHEQUE', 'TARJETA_CREDITO');

-- CreateEnum
CREATE TYPE "Bank" AS ENUM ('CHILE', 'BCI', 'ITAU', 'SANTANDER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CLP', 'UF');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('ACTIVA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('CONTABLE', 'LINEA_CREDITO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FINANZAS', 'PROYECTOS', 'OBRAS');

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'PRINCIPAL',
    "splitRatio" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "projectNumber" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "costCenterId" INTEGER,
    "accountId" INTEGER,
    "categoryId" INTEGER,
    "providerId" INTEGER,
    "purchaseOrderId" INTEGER,
    "movementType" "MovementType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4),
    "unitValue" DECIMAL(14,2),
    "net" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross" DECIMAL(14,2) NOT NULL,
    "paymentDate" DATE,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paymentMethod" "PaymentMethod",
    "bank" "Bank",
    "docIssueDate" DATE,
    "docDueDate" DATE,
    "gdNumber" TEXT,
    "rendicionNum" TEXT,
    "boletaNum" TEXT,
    "facturaNum" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'CLP',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "costCenterId" INTEGER,
    "providerId" INTEGER,
    "description" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedInvoice" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "costCenterId" INTEGER,
    "epNumber" TEXT,
    "invoiceNumber" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "received" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentDate" DATE,
    "issueDate" DATE,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDIENTE',
    "factoring" BOOLEAN NOT NULL DEFAULT false,
    "factoringInterest" DECIMAL(6,4),
    "factoringDueDate" DATE,
    "entity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingProposal" (
    "id" SERIAL NOT NULL,
    "costCenterId" INTEGER,
    "providerId" INTEGER,
    "description" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "pdfUrl" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankBalance" (
    "id" SERIAL NOT NULL,
    "bank" "Bank" NOT NULL,
    "companyId" INTEGER NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "type" "BalanceType" NOT NULL DEFAULT 'CONTABLE',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FINANZAS',
    "companyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_rut_key" ON "Company"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE INDEX "CostCenter_companyId_idx" ON "CostCenter"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_rut_key" ON "Provider"("rut");

-- CreateIndex
CREATE INDEX "Transaction_companyId_idx" ON "Transaction"("companyId");

-- CreateIndex
CREATE INDEX "Transaction_costCenterId_idx" ON "Transaction"("costCenterId");

-- CreateIndex
CREATE INDEX "Transaction_paymentDate_idx" ON "Transaction"("paymentDate");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedInvoice" ADD CONSTRAINT "IssuedInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedInvoice" ADD CONSTRAINT "IssuedInvoice_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingProposal" ADD CONSTRAINT "ClosingProposal_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingProposal" ADD CONSTRAINT "ClosingProposal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankBalance" ADD CONSTRAINT "BankBalance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
