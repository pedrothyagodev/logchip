import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "logchip123";

// Popula um tenant de demonstração (Prefeitura de Ribeira do Amparo) com
// usuário de acesso, veículos, condutores, vínculos e multas para o piloto do FICI.
async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "ribeira-do-amparo" },
    update: {},
    create: { name: "Prefeitura de Ribeira do Amparo", slug: "ribeira-do-amparo" },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@ribeira-do-amparo.gov.br" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@ribeira-do-amparo.gov.br",
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { tenantId_plate: { tenantId: tenant.id, plate: "ABC1D23" } },
    update: {},
    create: {
      tenantId: tenant.id,
      plate: "ABC1D23",
      model: "Fiat Strada",
      department: "Secretaria de Obras",
    },
  });

  const driver = await prisma.driver.upsert({
    where: { tenantId_cpf: { tenantId: tenant.id, cpf: "11144477735" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "João da Silva",
      cpf: "11144477735",
      cnh: "98765432100",
      department: "Secretaria de Obras",
    },
  });

  await prisma.driverAssignment.upsert({
    where: { id: `${vehicle.id}-${driver.id}-seed` },
    update: {},
    create: {
      id: `${vehicle.id}-${driver.id}-seed`,
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startsAt: new Date("2026-01-01T08:00:00-03:00"),
      endsAt: null,
    },
  });

  await prisma.infraction.upsert({
    where: { tenantId_autoNumber: { tenantId: tenant.id, autoNumber: "AIT-000123" } },
    update: {},
    create: {
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      autoNumber: "AIT-000123",
      code: "7455-0",
      description: "Transitar em velocidade superior à máxima permitida",
      occurredAt: new Date("2026-02-10T14:30:00-03:00"),
      location: "Av. Principal, Ribeira do Amparo - BA",
      deadlineAt: new Date("2026-03-10T23:59:59-03:00"),
    },
  });

  console.log(`Seed concluído para o tenant "${tenant.slug}".`);
  console.log(`Login: admin@ribeira-do-amparo.gov.br / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
