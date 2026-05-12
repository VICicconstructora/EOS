// Contexto CBR embebido — usado como contexto en el prompt de la entrevista de onboarding.
// Extracto de los documentos CBR más relevantes para que la IA haga preguntas contextualizadas.

export const CBR_CONTEXT = `
## BASE DE DATOS IC CONSTRUCTORA (Contexto para preguntas contextualizadas)

### Portafolio activo — proyectos propios (datos en CRM/Sinco)
Bosque Central (3 etapas, 545 ventas), Castilla Imperial (2A/2B/Parqueaderos, 271 ventas),
Castilla Living (2 etapas, 503 ventas), Gaia (2 etapas, 24 ventas),
La Hacienda Jamundí E1 (147 ventas), Praia Natura (E1/E2/E3, 265 ventas),
Primera Este (E1-2-3, 170 ventas), Reserva de Oporto (E1-2-3, 742 ventas).

### Portafolio activo — proyectos socios (datos en Flujo Histórico / Excel)
Azul Celeste (E1-E4), Azul Turquesa (E1-E4), Mitika (E1-E4), Verde Vivo (E1-E4), Well.

### Pipeline / nuevos negocios (candidatos ROCA Q2 2026: cerrar 3 antes del 30 jun 2026)
Alpujarra, Anapoima, BLVD 92, Consejo, Fabricato, Gran Manzana, La Hacienda E2-E4, Tierra Linda, Valle de Ezquio.

### KPIs principales que el equipo gerencial revisa
- Ventas YTD vs PPTO (valorneto de ventas activas acumuladas en el año)
- Escrituración YTD vs PPTO (firmas de escritura cliente completadas)
- Trámites Cumplidos/Programados por proyecto (pipeline: promesa → crédito → subsidio → escritura)
- Cartera Pre-escritura: recaudo de cuotas iniciales
- Cartera Post-escritura: desembolsos de crédito hipotecario + subsidios

### Áreas de la empresa y sus responsabilidades sobre datos

CEO: Juan Paulo McAllister
Gerencia de Desarrollo: VACANTE (cubre el CEO interinamente)

- Experiencia — Gerente: Mónica Báez
  Responsabilidades: ventas, cartera, trámites, CRM, mercadeo

- Construcción — Gerente: Andrés Arango
  Responsabilidades: presupuesto de obra, avance físico, contratistas

- Financiero — Gerente: Juan José Leal
  Responsabilidades: tesorería, contabilidad, P&G

- Talento Humano — Gerente: Diana Olave
  Responsabilidades: RRHH, selección, bienestar, calidad de procesos

- Control — Gerente: Marcela Arroyave
  Responsabilidades: compras, costos, posventas, calidad

- Jurídico — Director: Nataly Vinchira
  Responsabilidades: escrituración, compliance, litigios

- BIM, Analítica y TI — Director: Luis Miguel Serrano
  Responsabilidades: infraestructura, integraciones ERP, Supabase IC

### Organigrama completo por área

CONSTRUCCIÓN (Gerente: Andrés Arango)
  - Julián Andrés García Orozco — Director de Construcción
  - Lina Paola Sánchez Herrera — Director de Presupuestos y Programación
  - Pablo Andrés Ángel Pérez — Director de Coordinación de Diseño
  - Andrés Felipe Ospina Martínez — Coordinador de Gestión Ambiental
  Directores de Obra:
  - Carlos Julián Valencia Restrepo
  - Oscar Emilsun Fandiño Sepúlveda
  - Mauricio Arias
  - Eliecer Aldana Pinzón
  - Jorge Nelson Vela Fonseca
  - Jairo Ernesto Mera Patiño
  - Fabián Andrés Cardona Motato
  - Sandra Patricia Solano Maya
  - Lina María Jaimes Aguilar
  - Alfonso Escobar Trujillo
  - Holmes Enrique de la Rosa Díaz
  - Jaime Alberto Cabezas Molano
  - Elver Alejandro Sopo Uribe
  - Freddy Gabriel Solano Toloza
  - Olga Lucía Murcia Parra

FINANCIERO (Gerente: Juan José Leal)
  - Gloria Enith Niño Garzón — Director Financiero
  - Diana Lucía Pinzón Ruiz — Director de Tesorería
  - Liliana María López Mojica — Director de Contabilidad

TALENTO HUMANO (Gerente: Diana Olave)
  - Liseth Adriana Guevara Gutiérrez — Coordinadora de Seguridad y Salud en el Trabajo
  - Natalia Guzmán García — Coordinadora de Compensación, Facturación y Beneficios
  - Noé Alfredo Castro Vargas — Coordinador de Gestión Documental y Administrativa
  - Luisa María Guerrero Cruz — Coordinadora de Selección, Desarrollo y Bienestar
  - Ana María Córdoba Córdoba — Analista de Calidad y Procedimientos
  - John Edwin Vargas Hernández — Asistente de Gestión Documental
  (más equipo de residentes SST en obras)

CONTROL (Gerente: Marcela Arroyave)
  - Álvaro Enrique Bravo Cortés — Director de Compras y Contratación
  - Laura Sofía Angarita González — Director de Compras y Contratación
  - Kerly Hoanna Cadena Guevara — Director de Control de Costos
  - Óscar Arley Alarcón — Analista de Calidad

JURÍDICO (Director: Nataly Vinchira)
  - Edgar Eduardo Merchán Galindo — Coordinador Jurídico
  - Bryan Andrés Mahecha Murcia — Abogado Senior
  - Paula Daniela Barona Díaz — Abogada Senior
  - John Freddy Rojas Rodríguez — Analista Jurídico
  - Ligia Isabel Sánchez Torres — Analista Jurídico

BIM, ANALITICA Y TI (Director: Luis Miguel Serrano)
  - Rubiel Albeiro Murcia Gómez — Coordinador TI
  - John Fredy Lozano Vargas — Analista de Datos
  - Mary Torres Sánchez — Asistente TI

### Stack tecnológico
Microsoft 365 (Teams, SharePoint, Outlook, Excel, Power BI, Fabric) + Supabase IC + ERP Sinco.
`;

export const INTERVIEW_SECTIONS = [
  {
    id: 1,
    title: 'Tu contexto en IC',
    description: 'Tiempo en la empresa y responsabilidad principal este trimestre',
  },
  {
    id: 2,
    title: 'Tu trabajo y proyectos',
    description: 'Proyectos en los que participas y principales cuellos de botella',
  },
  {
    id: 3,
    title: 'Tu equipo',
    description: 'A quién lideras y con qué áreas coordinas más',
  },
  {
    id: 4,
    title: 'Prioridades y ROCAS',
    description: 'Tu ROCA principal Q2 2026 y qué podría hacerte fallar',
  },
  {
    id: 5,
    title: 'Datos y comunicación',
    description: 'Qué datos revisas y cómo prefieres recibir información',
  },
  {
    id: 6,
    title: 'Cómo puede ayudarte la IA',
    description: 'Tareas que te gustaría delegar o automatizar',
  },
];
