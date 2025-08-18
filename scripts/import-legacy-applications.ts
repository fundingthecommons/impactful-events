import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

// Column mapping for Google Forms CSV
const GOOGLE_FORM_MAPPING: Record<string, string> = {
  "Timestamp": "timestamp",
  "First and last legal name as listed on your passport /Nombre y apellido como aparece en tu pasaporte": "full_name",
  "Email / Correo electrónico": "email",
  "What is your nationality (for Visa support)? / ¿Cuál es tu nacionalidad? (en caso de que necesites una Visa)": "nationality",
  "GitHub": "github",
  "Website / Página web": "website",
  "Twitter": "twitter",
  "LinkedIn": "linkedin",
  "Telegram": "telegram",
  "What do you want to build during the residency? / ¿Qué proyecto quieres desarrollar durante la residencia?": "project_description",
  "What are you working on now? Please give a brief description. / ¿En qué estás trabajando ahora? Por favor explica brevemente.": "current_work",
  "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems? / Cuéntanos más sobre tu experiencia en criptografía, criptomonedas, tecnologías descentralizadas y/o sistemas de financiación de bienes públicos.": "prior_experience",
  "What are your technical skills? Please select all that apply. / ¿Cuáles son tus habilidades técnicas? Por favor, selecciona todas las que apliquen.": "technical_skills",
  "If you answered 'other' in the previous question, please specify here. If you did not select 'other,' please answer with N/A./ Si respondiste \"otro\" en la pregunta anterior, por favor da más detalle. Si no seleccionaste \"otro\", responde con N/A.": "technical_skills_other",
  "On a scale of 1-10, 1 being a beginner, 5 being very confident about the skill, and 10 being world-class expert, how would you rate the technical skills you chose for the last two questions? / En una escala del 1 al 10, donde 1 es principiante, 5 es tener buen manejo y 10 es ser experto, ¿cómo calificarías las habilidades técnicas que marcaste en las dos preguntas anteriores?": "skill_rating",
  "Will you be able to attend the full program from October 15th through November 24th?": "program_availability",
  "What, if any, commitments (e.g. work/spouse/family) do you have that would make committing to the residency difficult? / ¿Qué compromisos, si es que tienes alguno  (trabajo, pareja, familia), podrían dificultarte comprometerte a atender la residencia?": "commitments",
  "Do you need financial support to attend the residency? / ¿Necesitas apoyo financiero para atender la residencia?": "financial_support",
  "If you answered 'yes' or 'partial support' to the previous question, please provide a brief explanation of your financial needs. If you answered 'no,' please respond with N/A. / Si respondiste \"sí\" o \"apoyo parcial\" en la pregunta anterior, por favor proporciona una breve explicación de tus necesidades económicas. Si respondiste \"no\", por favor indica N/A.": "financial_support_details",
  "Do you currently work with or on a project related to public goods or climate? If yes, please provide a brief description. / ¿Estás trabajando actualmente en algún proyecto relacionado con bienes públicos o sobre el clima? Si la respuesta es sí, cuéntanos brevemente de qué se trata.": "public_goods_work",
  "How did you hear about this program? If you were referred by someone, please tell us who. / ¿Cómo te enteraste delprograma? Si alguien te lo recomendó, por favor dinos quién fue.": "how_heard",
  "Is there anything else you want us to know about you? / ¿Hay algo más que quieras contarnos sobre ti?": "additional_info",
  "Do you agree to our terms and conditions? / ¿Aceptas nuestros términos y condiciones?": "terms_agreement",
  "Why are you interested in public goods or climate? Please explain in 200-300 words. / ¿Por qué te interesan los temas acerca de bienes públicos o clima? Por favor explícanos en 200-300 palabras.": "public_goods_interest",
  "Do you agree to our media policy? / ¿Te parece bien cómo usamos fotos y videos del evento (ver política)?": "media_policy",
};

// Column mapping for Notion forms CSV (based on the form structure provided)
const NOTION_FORM_MAPPING: Record<string, string> = {
  "First and last legal name as listed on your passport": "full_name",
  "Email": "email",
  "What is your nationality": "nationality", 
  "Twitter": "twitter",
  "GitHub": "github",
  "LinkedIn": "linkedin",
  "Telegram": "telegram",
  "Will you be able to attend the full program from October 24th through November 14th?": "program_availability",
  "What do you want to build during the residency?": "project_description",
  "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems?": "prior_experience",
  "Do you need financial support to attend the residency?": "financial_support",
  "Do you need a visa?": "visa_needed",
  "Do you agree to our terms and conditions?": "terms_agreement",
  "What, if any, commitments (e.g. work/spouse/family) do you have that would make committing to the residency difficult?": "commitments",
  "How did you hear about this program? If you were referred by someone, please tell us who.": "how_heard",
  "Are you fully available for the duration of the residency?": "fully_available",
  "What are your technical skills? Please select all that apply.": "technical_skills",
  "If you answered 'other' in the previous question, please specify here. If you did not select 'other,' please answer with N/A.": "technical_skills_other",
  "On a scale of 1-10, 1 being a beginner, 5 being very confident about the skill, and 10 being world-class expert, how would you rate the technical skills you chose for the last two questions?": "skill_rating",
  "Tell us about a time when you contributed to a collaborative or open-source effort. What did you learn?": "open_source_experience",
  "What does 'funding the commons' mean to you, and why is it important?": "funding_commons_meaning",
  "What motivates you to contribute to the public goods ecosystem?": "public_goods_motivation",
  "Are you currently working on—or interested in building—real-fi solutions (solutions for the real world)? Please elaborate.": "realfi_interest",
  "Do privacy-preserving tools or protocols play a role in your work? If so, how?": "privacy_tools",
  "Have you experimented with or proposed new public goods funding mechanisms (e.g. quadratic funding, retroPGF, hypercerts)? Tell us more.": "funding_mechanisms",
  "How do you think we should measure the impact of public goods?": "impact_measurement",
  "What kind of people or expertise are you hoping to connect with during the residency?": "connections_sought",
  "What can you offer to others in the cohort?": "cohort_contribution",
  "Please include a one-minute introduction video. You can upload it here, or share a private YouTube or Loom link below.": "intro_video_link",
  "Is there anything else you want us to know about you?": "additional_info",
  "Do you want to subscribe to our newsletter?": "newsletter_subscription",
};

async function readCSV(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv.default())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function importApplications(
  csvFilePath: string, 
  eventId: string, 
  source: 'google_form' | 'notion_form'
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log(`📖 Reading CSV file: ${csvFilePath}`);
    const csvData = await readCSV(csvFilePath);
    stats.total = csvData.length;

    console.log(`📊 Found ${csvData.length} rows in CSV`);

    // Get the column mapping based on source
    const columnMapping = source === 'google_form' ? GOOGLE_FORM_MAPPING : NOTION_FORM_MAPPING;

    // Get event questions for mapping
    const eventQuestions = await prisma.applicationQuestion.findMany({
      where: { eventId },
    });

    const questionMap = new Map(eventQuestions.map(q => [q.questionKey, q]));

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Extract email from row
        let email = '';
        for (const [csvColumn, questionKey] of Object.entries(columnMapping)) {
          if (questionKey === 'email' && row && row[csvColumn]) {
            email = row[csvColumn]?.trim().toLowerCase() ?? '';
            break;
          }
        }

        if (!email) {
          stats.errors.push({
            row: rowNumber,
            email: 'N/A',
            error: 'Email not found in row'
          });
          continue;
        }

        // Check if application already exists
        const existingApplication = await prisma.application.findFirst({
          where: {
            email,
            eventId,
          },
        });

        if (existingApplication) {
          console.log(`⚠️  Skipping duplicate application for ${email}`);
          stats.skipped++;
          continue;
        }

        // Create application
        const application = await prisma.application.create({
          data: {
            eventId,
            email,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            ...(source === 'google_form' && {
              googleFormId: `google_${rowNumber}`,
            }),
            ...(source === 'notion_form' && {
              notionPageId: `notion_${rowNumber}`,
            }),
          },
        });

        // Create responses for mapped questions
        const responses = [];
        for (const [csvColumn, questionKey] of Object.entries(columnMapping)) {
          const question = questionMap.get(questionKey);
          const value = row?.[csvColumn];

          if (question && value && value.trim()) {
            responses.push({
              applicationId: application.id,
              questionId: question.id,
              answer: value.trim(),
            });
          }
        }

        if (responses.length > 0) {
          await prisma.applicationResponse.createMany({
            data: responses,
          });
        }

        stats.imported++;
        console.log(`✅ Imported application for ${email} (${stats.imported}/${stats.total})`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          row: rowNumber,
          email: csvData[i]?.email || 'N/A',
          error: errorMessage
        });
        console.error(`❌ Error processing row ${rowNumber}:`, errorMessage);
      }
    }

  } catch (error) {
    console.error('❌ Failed to read CSV file:', error);
    throw error;
  }

  return stats;
}

async function main() {
  console.log('🚀 Starting legacy application import...');

  // Get event ID for residency
  const residencyEvent = await prisma.event.findUnique({
    where: { id: 'funding-commons-residency-2024' },
  });

  if (!residencyEvent) {
    console.error('❌ Residency event not found. Please run the seed script first.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('❌ Usage: tsx scripts/import-legacy-applications.ts <csv-file-path> <source>');
    console.error('   source: google_form | notion_form');
    console.error('   Example: tsx scripts/import-legacy-applications.ts data/google_forms.csv google_form');
    process.exit(1);
  }

  const [csvFilePath, source] = args;

  if (!source || !['google_form', 'notion_form'].includes(source)) {
    console.error('❌ Source must be either "google_form" or "notion_form"');
    process.exit(1);
  }

  if (!csvFilePath || !fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    const stats = await importApplications(
      csvFilePath,
      residencyEvent.id,
      source as 'google_form' | 'notion_form'
    );

    console.log('\n🎉 Import completed!');
    console.log(`📊 Statistics:`);
    console.log(`   Total rows: ${stats.total}`);
    console.log(`   Imported: ${stats.imported}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((error) => {
        console.log(`   Row ${error.row} (${error.email}): ${error.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { importApplications };