/**
 * Seed script: Demo schedule data for showcasing all 4 schedule views
 *
 * Based on real conference data from DWeb Camp / Protocol Labs events.
 * Creates venues, session types, tracks, sessions with speakers, and
 * user profiles so the Expanded view shows bios/titles.
 *
 * Usage:
 *   bunx tsx scripts/seed-demo-schedule.ts
 *
 * Requires an event with slug 'intelligence-at-the-frontier' to exist.
 * Change EVENT_SLUG below if targeting a different event.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_SLUG = "intelligence-at-the-frontier";

// ── Conference day: Tuesday, June 10 2025 ────────────────────────
// All times in UTC (CEST = UTC+2, so 10:00 CEST = 08:00 UTC)
const DAY = "2025-06-10";
function t(hour: number, min: number): Date {
  return new Date(`${DAY}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`);
}

// ── Venues / Floors ──────────────────────────────────────────────
const VENUES = [
  { name: "Bread Cube", order: 1 },
  { name: "Einkeller", order: 2 },
  { name: "DWeb Terrace", order: 3 },
  { name: "Canopy", order: 4 },
  { name: "Design Space", order: 5 },
  { name: "Workshop Cube", order: 6 },
];

// ── Session Types ────────────────────────────────────────────────
const SESSION_TYPES = [
  { name: "Opening & Closing Remarks", color: "#e06060", order: 1 },
  { name: "Activation", color: "#e8a838", order: 2 },
  { name: "Lightning Talk", color: "#c084fc", order: 3 },
  { name: "Roundtable", color: "#93b5f5", order: 4 },
  { name: "Unconference Open Space", color: "#34d4a0", order: 5 },
  { name: "Workshop", color: "#86d861", order: 6 },
];

// ── Tracks ───────────────────────────────────────────────────────
const TRACKS = [
  { name: "Governance & Economics", color: "#8b5cf6", order: 1 },
  { name: "Privacy & Identity", color: "#3b82f6", order: 2 },
  { name: "Community & Culture", color: "#f97316", order: 3 },
  { name: "Infrastructure & Tech", color: "#10b981", order: 4 },
];

// ── Speakers (will become Users + UserProfiles) ──────────────────
const SPEAKERS = [
  {
    firstName: "David",
    surname: "Casey",
    email: "david.casey@demo.example",
    bio: "Community organiser and event producer with over a decade of experience building spaces for meaningful connection. David has facilitated gatherings across three continents and is passionate about creating environments where diverse voices can be heard.",
    jobTitle: "Community Director",
    company: "DWeb Foundation",
  },
  {
    firstName: "Cank",
    surname: "Auden",
    email: "cank.auden@demo.example",
    bio: "Facilitator and conversation designer exploring emergent dialogue practices. Cank develops frameworks that help groups navigate complexity and find alignment through structured yet organic conversation.",
    jobTitle: "Conversation Designer",
    company: "Dialogue Labs",
  },
  {
    firstName: "Stephan",
    surname: "Zimmerli",
    email: "stephan.zimmerli@demo.example",
    bio: "Visual artist and researcher whose work explores the intersection of exile, memory, and digital culture. His Studiolo Exile project examines how displaced communities maintain cultural identity through creative practice.",
    jobTitle: "Artist & Researcher",
    company: "Studiolo Exile Project",
  },
  {
    firstName: "Atabey",
    surname: "Romero",
    email: "atabey.romero@demo.example",
    bio: "Cultural practitioner and embodied knowledge researcher. Atabey (fka Carlos Maria Romero) works at the nexus of traditional knowledge systems and contemporary art, with a focus on Afro-Caribbean musical traditions as vehicles for collective memory.",
    jobTitle: "Cultural Practitioner",
    company: "Independent",
  },
  {
    firstName: "Beth",
    surname: "McCarthy",
    email: "beth.mccarthy@demo.example",
    bio: "Researcher and organiser focused on technology governance and human rights. Beth works on the political economy of digital infrastructure and has published extensively on how technical systems shape power dynamics in society.",
    jobTitle: "Research Lead",
    company: "Tech & Society Lab",
  },
  {
    firstName: "Alessandro",
    surname: "Longo",
    email: "alessandro.longo@demo.example",
    bio: "Journalist and researcher covering the intersection of technology, politics, and society. Alessandro Y. Longo has contributed to major European publications and focuses on how digital systems affect democratic processes.",
    jobTitle: "Technology Journalist",
    company: "Digital Europe Review",
  },
  {
    firstName: "Jacob",
    surname: "Huehn",
    email: "jacob.huehn@demo.example",
    bio: "Music technologist and decentralisation advocate. Jacob works on community-driven infrastructure for the music industry, helping artists build sustainable careers outside centralised platforms.",
    jobTitle: "Co-Founder",
    company: "Resonance DAO",
  },
  {
    firstName: "Lene",
    surname: "Vollhardt",
    email: "lene.vollhardt@demo.example",
    bio: "Performance artist and protocol designer exploring the aesthetics of decentralised systems. Lene creates immersive experiences that make abstract technical concepts tangible through art and embodied interaction.",
    jobTitle: "Artist & Protocol Designer",
    company: "Swirls Collective",
  },
  {
    firstName: "Gilberto",
    surname: "Morishaw",
    email: "gilberto.morishaw@demo.example",
    bio: "Social impact technologist working at the intersection of blockchain and human rights. Gilberto has led initiatives connecting grassroots movements with decentralised tools across Latin America and the Caribbean.",
    jobTitle: "Impact Director",
    company: "Solidarity Tech",
  },
  {
    firstName: "Joshua",
    surname: "Davila",
    email: "joshua.davila@demo.example",
    bio: "Author of 'Blockchain Radicals' and researcher on cryptoeconomic governance. Joshua explores how decentralised protocols can be designed to serve communities rather than extract from them.",
    jobTitle: "Author & Researcher",
    company: "Blockchain Radicals",
  },
  {
    firstName: "Stephen",
    surname: "Reid",
    email: "stephen.reid@demo.example",
    bio: "Technologist, community builder, and educator working on regenerative systems. Stephen has been instrumental in developing tools for decentralised governance and collective decision-making.",
    jobTitle: "Educator & Builder",
    company: "Dandelion Collective",
  },
  {
    firstName: "Martin",
    surname: "Köppelmann",
    email: "martin.koppelmann@demo.example",
    bio: "Co-founder of Gnosis and creator of Circles, a community currency system built on trust networks. Martin has been working on decentralised applications since 2015 and is deeply focused on financial inclusion.",
    jobTitle: "Co-Founder",
    company: "Gnosis / Circles",
  },
  {
    firstName: "Rene",
    surname: "Reinsberg",
    email: "rene.reinsberg@demo.example",
    bio: "Entrepreneur and technologist focused on digital identity and data sovereignty. Rene co-founded a platform enabling individuals to control their personal data while participating in the digital economy.",
    jobTitle: "Co-Founder",
    company: "Celo Foundation",
  },
  {
    firstName: "Guillermo",
    surname: "Gallardo",
    email: "guillermo.gallardo@demo.example",
    bio: "Cross-chain infrastructure developer focused on simplifying decentralised tools for social good. Guillermo builds bridges between blockchain ecosystems to enable seamless impact-driven applications.",
    jobTitle: "Protocol Engineer",
    company: "Intents Protocol",
  },
  {
    firstName: "Ryan",
    surname: "Taylor",
    email: "ryan.taylor@demo.example",
    bio: "Localisation engineer and open-source advocate. Ryan works on making decentralised tools accessible to non-English-speaking communities through live translation and internationalisation infrastructure.",
    jobTitle: "Localisation Lead",
    company: "Open Language Project",
  },
  {
    firstName: "Fatemeh",
    surname: "Fannizadeh",
    email: "fatemeh.fannizadeh@demo.example",
    bio: "Digital rights lawyer and activist working on technology policy in the Middle East and North Africa. Fatemeh advocates for open internet access and encryption as fundamental human rights.",
    jobTitle: "Digital Rights Lawyer",
    company: "Access Now",
  },
  {
    firstName: "Rashid",
    surname: "Owoyele",
    email: "rashid.owoyele@demo.example",
    bio: "Researcher on digital enclosures and platform governance. Rashid studies how walled gardens and proprietary systems create new forms of digital colonialism, and advocates for open alternatives.",
    jobTitle: "Researcher",
    company: "Digital Commons Lab",
  },
  {
    firstName: "Luce",
    surname: "deLire",
    email: "luce.delire@demo.example",
    bio: "Philosopher and writer exploring the political dimensions of technology. Luce examines how technical infrastructure shapes possibilities for resistance and solidarity in the digital age.",
    jobTitle: "Philosopher",
    company: "University of Berlin",
  },
  {
    firstName: "Marina",
    surname: "Markezic",
    email: "marina.markezic@demo.example",
    bio: "Policy researcher focused on European digital regulation. Marina works on understanding how legislative frameworks like the Digital Markets Act affect decentralised technology development.",
    jobTitle: "Policy Researcher",
    company: "European Digital Rights",
  },
  {
    firstName: "Tara",
    surname: "Merk",
    email: "tara.merk@demo.example",
    bio: "Infrastructure researcher focused on community-owned data centres. Tara studies models for democratic ownership of physical computing infrastructure and their implications for data sovereignty.",
    jobTitle: "Infrastructure Researcher",
    company: "Community Cloud Project",
  },
  {
    firstName: "Rainer",
    surname: "Rehak",
    email: "rainer.rehak@demo.example",
    bio: "Computer scientist and digital policy expert. Rainer works on surveillance-resistant infrastructure and has been a vocal advocate for community-controlled alternatives to hyperscale cloud providers.",
    jobTitle: "Digital Policy Expert",
    company: "Weizenbaum Institute",
  },
  {
    firstName: "Julian",
    surname: "Pütz",
    email: "julian.putz@demo.example",
    bio: "Systems engineer specialising in sustainable computing infrastructure. Julian designs energy-efficient data centre architectures that prioritise local community benefit over corporate extraction.",
    jobTitle: "Systems Engineer",
    company: "Green Computing Initiative",
  },
  {
    firstName: "André",
    surname: "Ullrich",
    email: "andre.ullrich@demo.example",
    bio: "Economist studying alternative models of infrastructure ownership. André researches cooperative and municipal ownership structures for digital infrastructure across European cities.",
    jobTitle: "Economist",
    company: "Infrastructure Commons",
  },
  {
    firstName: "Anke",
    surname: "Liu",
    email: "anke.liu@demo.example",
    bio: "Financial inclusion practitioner with experience building accessible financial tools in emerging markets. Anke focuses on practical implementation challenges of bringing decentralised finance to underserved communities.",
    jobTitle: "Financial Inclusion Lead",
    company: "Open Finance Lab",
  },
  {
    firstName: "Nusha",
    surname: "Rubin",
    email: "nusha.rubin@demo.example",
    bio: "Music industry strategist and community organiser. Nusha works on building fair compensation models for independent artists using decentralised technologies.",
    jobTitle: "Music Strategist",
    company: "Fair Music Alliance",
  },
  {
    firstName: "Arvy",
    surname: "K",
    email: "arvy.k@demo.example",
    bio: "Sound engineer and technologist exploring decentralised distribution systems for independent music. Arvy builds tools that give artists direct control over how their work reaches audiences.",
    jobTitle: "Sound Engineer",
    company: "Independent",
  },
  {
    firstName: "Lorena",
    surname: "Junghans",
    email: "lorena.junghans@demo.example",
    bio: "Cultural producer and music industry researcher. Lorena studies how community-driven platforms can transform the relationship between artists, labels, and listeners.",
    jobTitle: "Cultural Producer",
    company: "Music Commons",
  },
  {
    firstName: "Shai",
    surname: "Perednik",
    email: "shai.perednik@demo.example",
    bio: "Economist exploring intent-driven market design. Shai researches how local economies can use decentralised mechanisms to build resilience against global supply chain disruptions.",
    jobTitle: "Economist",
    company: "Intent Economics Lab",
  },
  {
    firstName: "Cassandra",
    surname: "Thornton",
    email: "cassandra.thornton@demo.example",
    bio: "Developer advocate and educator. Cassandra works on making technical concepts accessible and has a particular interest in the intersection of technology and social justice movements.",
    jobTitle: "Developer Advocate",
    company: "Open Source Alliance",
  },
  {
    firstName: "Grayson",
    surname: "Earle",
    email: "grayson.earle@demo.example",
    bio: "Artist and technologist creating works that critique capitalism and explore alternative economic models. Grayson's projects often use games and interactive media to engage audiences with complex systemic issues.",
    jobTitle: "Artist & Technologist",
    company: "The New School",
  },
  {
    firstName: "Kat",
    surname: "Young",
    email: "kat.young@demo.example",
    bio: "Human rights technologist focused on building tools for frontline defenders. Kat develops secure communication and documentation platforms used by activists in high-risk environments.",
    jobTitle: "Human Rights Technologist",
    company: "Frontline Tech",
  },
  {
    firstName: "Fotis",
    surname: "Tsiroukis",
    email: "fotis.tsiroukis@demo.example",
    bio: "Writer and game designer using speculative fiction to explore alternative futures. Fotis facilitates collaborative worldbuilding sessions where participants co-create visions of just and sustainable societies.",
    jobTitle: "Writer & Game Designer",
    company: "Speculative Futures",
  },
  {
    firstName: "Eileen",
    surname: "Wagner",
    email: "eileen.wagner@demo.example",
    bio: "Privacy designer and researcher. Eileen works on making privacy-preserving technologies usable and accessible, bridging the gap between cryptographic protocols and everyday user experience.",
    jobTitle: "Privacy Designer",
    company: "Simply Secure",
  },
  {
    firstName: "Stina",
    surname: "Gustafsson",
    email: "stina.gustafsson@demo.example",
    bio: "Researcher on value creation in commons-based peer production. Stina studies how open-source communities generate and distribute value beyond market mechanisms.",
    jobTitle: "Researcher",
    company: "Value Commons Lab",
  },
  {
    firstName: "Oliver",
    surname: "Beige",
    email: "oliver.beige@demo.example",
    bio: "Economist and governance researcher. Oliver works on vibecoding governance — the practice of encoding community values and vibes into protocol-level decision-making systems.",
    jobTitle: "Governance Researcher",
    company: "Cryptoeconomics Lab",
  },
  {
    firstName: "Theo",
    surname: "Beutel",
    email: "theo.beutel@demo.example",
    bio: "Protocol designer focused on cryptoeconomic mechanisms for fair resource allocation. Theo builds models that help decentralised communities govern shared resources sustainably.",
    jobTitle: "Protocol Designer",
    company: "Mechanism Institute",
  },
  {
    firstName: "Jake",
    surname: "Hartnell",
    email: "jake.hartnell@demo.example",
    bio: "DAO infrastructure builder and governance researcher. Jake develops on-chain governance tools that enable communities to make collective decisions transparently and efficiently.",
    jobTitle: "DAO Builder",
    company: "DAO DAO",
  },
  {
    firstName: "Rita",
    surname: "Palma",
    email: "rita.palma@demo.example",
    bio: "Designer exploring multispecies perspectives in technology design. Rita creates frameworks for designing digital systems that account for ecological relationships and non-human stakeholders.",
    jobTitle: "Speculative Designer",
    company: "Multispecies Studio",
  },
  {
    firstName: "Ira",
    surname: "Nezhynska",
    email: "ira.nezhynska@demo.example",
    bio: "Brand strategist and design researcher. Ira helps open-source and decentralised projects develop compelling identities through a process of reverse-engineering reputation and community perception.",
    jobTitle: "Brand Strategist",
    company: "Reputations Lab",
  },
  {
    firstName: "Catherine",
    surname: "Schmidt",
    email: "catherine.schmidt@demo.example",
    bio: "Visual designer specialising in data visualisation for social justice. Catherine creates design systems that help communities understand complex power structures and envision alternatives.",
    jobTitle: "Visual Designer",
    company: "Resilience Design",
  },
  {
    firstName: "Ruben",
    surname: "Russel",
    email: "ruben.russel@demo.example",
    bio: "Interface designer focused on participatory design methods. Ruben facilitates co-design processes where communities directly shape the digital tools they use.",
    jobTitle: "Participatory Designer",
    company: "Co-Design Studio",
  },
  {
    firstName: "Rade",
    surname: "Stijovic",
    email: "rade.stijovic@demo.example",
    bio: "Graphic designer and visual researcher exploring solidarity through design. Rade creates visual identities for social movements and community organisations across the Balkans and beyond.",
    jobTitle: "Visual Researcher",
    company: "Solidarity Graphics",
  },
];

// ── Sessions ─────────────────────────────────────────────────────
// Each session references venue, type, and track by name (resolved at seed time)
// Speaker refs use email as the lookup key
interface SessionDef {
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  venue: string;
  type: string;
  track: string | null;
  speakers: Array<{ email: string; role?: string }>;
}

const SESSIONS: SessionDef[] = [
  // ── 10:00 ──
  {
    title: "Welcome Words",
    description: "Opening remarks and welcome to the conference. Setting intentions for the day and introducing the themes that will guide our conversations.",
    start: t(8, 0),
    end: t(8, 20),
    venue: "Einkeller",
    type: "Opening & Closing Remarks",
    track: null,
    speakers: [{ email: "david.casey@demo.example" }],
  },
  {
    title: "Conversation Protocols",
    description: "An interactive workshop exploring structured dialogue methods for navigating complex topics. Participants will learn and practise conversation frameworks designed to surface collective intelligence.",
    start: t(8, 0),
    end: t(8, 40),
    venue: "DWeb Terrace",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [{ email: "cank.auden@demo.example", role: "Facilitator" }],
  },
  {
    title: "Unconference Open Space",
    description: "Self-organised sessions proposed and led by participants. Come with ideas, leave with collaborators. The open space runs throughout the morning — drop in and out as topics evolve.",
    start: t(8, 0),
    end: t(10, 0),
    venue: "Canopy",
    type: "Unconference Open Space",
    track: null,
    speakers: [],
  },
  // ── 10:20 ──
  {
    title: "\"Studiolo Exile\" Artist Talk",
    description: "A multimedia presentation exploring displacement, cultural memory, and the role of the studio as a space of refuge. Stephan shares work from his ongoing Studiolo Exile project.",
    start: t(8, 20),
    end: t(8, 30),
    venue: "Einkeller",
    type: "Lightning Talk",
    track: "Community & Culture",
    speakers: [{ email: "stephan.zimmerli@demo.example" }],
  },
  // ── 10:30 ──
  {
    title: "Bullerengue, an Embodied Practice of Communitarian Knowledge and Memory",
    description: "An exploration of Bullerengue — an Afro-Colombian musical tradition — as a living archive of communitarian knowledge. This talk examines how embodied practices carry and transmit collective memory across generations.",
    start: t(8, 30),
    end: t(8, 40),
    venue: "Einkeller",
    type: "Lightning Talk",
    track: "Community & Culture",
    speakers: [{ email: "atabey.romero@demo.example" }],
  },
  // ── 10:40 ──
  {
    title: "Anarchiving as Collective Memory",
    description: "A roundtable exploring anarchiving — the practice of creating living, evolving archives that resist fixed narratives. Panellists discuss how decentralised tools can support non-hierarchical memory-keeping.",
    start: t(8, 40),
    end: t(9, 20),
    venue: "Einkeller",
    type: "Roundtable",
    track: "Community & Culture",
    speakers: [
      { email: "beth.mccarthy@demo.example", role: "Moderator" },
      { email: "alessandro.longo@demo.example", role: "Panelist" },
      { email: "jacob.huehn@demo.example", role: "Panelist" },
      { email: "atabey.romero@demo.example", role: "Panelist" },
      { email: "lene.vollhardt@demo.example", role: "Panelist" },
      { email: "stephan.zimmerli@demo.example", role: "Panelist" },
    ],
  },
  // ── 11:00 ──
  {
    title: "Onboarding to the Covenant Community",
    description: "A hands-on workshop for newcomers to the Covenant community. Learn about governance structures, contribution pathways, and how to get involved in building shared digital infrastructure.",
    start: t(9, 0),
    end: t(9, 40),
    venue: "Design Space",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [],
  },
  // ── 11:20 ──
  {
    title: "Welcome and Plenary",
    description: "The main welcome plenary bringing the full community together. Hear from organisers about the vision for this gathering and the key challenges we will tackle collectively over the coming days.",
    start: t(9, 20),
    end: t(9, 40),
    venue: "Bread Cube",
    type: "Opening & Closing Remarks",
    track: null,
    speakers: [
      { email: "gilberto.morishaw@demo.example" },
      { email: "joshua.davila@demo.example" },
      { email: "stephen.reid@demo.example" },
    ],
  },
  // ── 11:40 ──
  {
    title: "Swirls of Fortune \u2013 A Protocol Art Performance",
    description: "An immersive performance piece that translates blockchain protocol mechanics into physical movement and visual art. Participants experience firsthand how consensus mechanisms, token flows, and governance decisions feel in embodied form.",
    start: t(9, 40),
    end: t(10, 0),
    venue: "Einkeller",
    type: "Activation",
    track: "Governance & Economics",
    speakers: [{ email: "lene.vollhardt@demo.example" }],
  },
  {
    title: "Circles: Fair Money with Webs of Trust",
    description: "A deep dive into Circles, a community currency system where money is created through trust relationships rather than debt. Martin shares the latest developments and how trust-based currencies can serve as infrastructure for financial inclusion.",
    start: t(9, 40),
    end: t(10, 10),
    venue: "Bread Cube",
    type: "Lightning Talk",
    track: "Governance & Economics",
    speakers: [{ email: "martin.koppelmann@demo.example" }],
  },
  // ── 11:50 ──
  {
    title: "Data Sovereignty through Preserving Privacy & Verifying Identity",
    description: "How can individuals control their data while still participating in systems that require identity verification? This talk explores the tension between privacy and accountability, presenting practical approaches to data sovereignty.",
    start: t(9, 50),
    end: t(10, 20),
    venue: "Bread Cube",
    type: "Lightning Talk",
    track: "Privacy & Identity",
    speakers: [{ email: "rene.reinsberg@demo.example" }],
  },
  // ── 12:00 ──
  {
    title: "Intents for Impact: Simplifying Cross-Chain Solutions for the Common Good",
    description: "A practical workshop on using intent-based protocols to build cross-chain applications for social impact. Participants will learn how to design systems where complex blockchain interactions are simplified into clear human intentions.",
    start: t(10, 0),
    end: t(10, 40),
    venue: "Workshop Cube",
    type: "Workshop",
    track: "Infrastructure & Tech",
    speakers: [{ email: "guillermo.gallardo@demo.example" }],
  },
  {
    title: "Local Live Internationalization",
    description: "Making decentralised technology accessible across languages and cultures in real time. Ryan demonstrates tools and workflows for live localisation that can be applied to any open-source project.",
    start: t(10, 0),
    end: t(10, 40),
    venue: "DWeb Terrace",
    type: "Activation",
    track: "Infrastructure & Tech",
    speakers: [{ email: "ryan.taylor@demo.example" }],
  },
  {
    title: "Techno Tyranny, Digital Enclosures & Hospitable States",
    description: "A roundtable examining how digital platforms create new forms of enclosure and control. Panellists explore resistance strategies and the role of the state in either enabling or countering techno-authoritarianism.",
    start: t(10, 0),
    end: t(11, 0),
    venue: "Einkeller",
    type: "Roundtable",
    track: "Governance & Economics",
    speakers: [
      { email: "beth.mccarthy@demo.example", role: "Moderator" },
      { email: "fatemeh.fannizadeh@demo.example", role: "Panelist" },
      { email: "rashid.owoyele@demo.example", role: "Panelist" },
      { email: "alessandro.longo@demo.example", role: "Panelist" },
      { email: "luce.delire@demo.example", role: "Panelist" },
      { email: "marina.markezic@demo.example", role: "Panelist" },
    ],
  },
  {
    title: "Decentralised, Community-driven Infrastructures to Transform the Music Industry",
    description: "How can musicians take back control from centralised streaming platforms? This session explores community-driven alternatives — from decentralised distribution to fair royalty systems — that put artists first.",
    start: t(10, 0),
    end: t(10, 40),
    venue: "Design Space",
    type: "Workshop",
    track: "Infrastructure & Tech",
    speakers: [
      { email: "jacob.huehn@demo.example" },
      { email: "nusha.rubin@demo.example" },
      { email: "arvy.k@demo.example" },
      { email: "lorena.junghans@demo.example" },
    ],
  },
  {
    title: "Imagining Community-Owned Data Centers",
    description: "What if the buildings housing our data were owned by the communities they serve? This panel explores models for democratic ownership of physical computing infrastructure, from cooperative data centres to municipal cloud services.",
    start: t(10, 0),
    end: t(10, 40),
    venue: "Bread Cube",
    type: "Roundtable",
    track: "Infrastructure & Tech",
    speakers: [
      { email: "tara.merk@demo.example", role: "Moderator" },
      { email: "rainer.rehak@demo.example", role: "Panelist" },
      { email: "julian.putz@demo.example", role: "Panelist" },
      { email: "andre.ullrich@demo.example", role: "Panelist" },
    ],
  },
  {
    title: "Practical Approaches to Building for Financial Inclusion",
    description: "A hands-on workshop sharing lessons learned from deploying financial inclusion tools in emerging markets. Anke covers common pitfalls, regulatory considerations, and design patterns that actually work for underserved communities.",
    start: t(10, 0),
    end: t(10, 40),
    venue: "Workshop Cube",
    type: "Workshop",
    track: "Governance & Economics",
    speakers: [{ email: "anke.liu@demo.example" }],
  },
  // ── 13:00 Lunch ──
  {
    title: "Lunch",
    description: null,
    start: t(11, 0),
    end: t(12, 0),
    venue: "Bread Cube",
    type: "Activation",
    track: null,
    speakers: [],
  },
  {
    title: "Lunch",
    description: null,
    start: t(11, 0),
    end: t(12, 0),
    venue: "Canopy",
    type: "Activation",
    track: null,
    speakers: [],
  },
  // ── 14:00 ──
  {
    title: "Unconference Open Space",
    description: "Afternoon open space sessions. Propose a topic on the board, gather your people, and dive deep into the conversations that matter most to you.",
    start: t(12, 0),
    end: t(14, 0),
    venue: "Canopy",
    type: "Unconference Open Space",
    track: null,
    speakers: [],
  },
  {
    title: "Intent-Driven Economies: Rethinking Labor, Markets, and Local Resilience",
    description: "How might economies look if they were organised around human intentions rather than profit maximisation? Shai presents research on intent-driven market design and its potential to build local economic resilience.",
    start: t(12, 0),
    end: t(12, 30),
    venue: "Einkeller",
    type: "Lightning Talk",
    track: "Governance & Economics",
    speakers: [{ email: "shai.perednik@demo.example" }],
  },
  {
    title: "Bridging Tech, Solidarity, and Human Rights",
    description: "A roundtable exploring how technology can be a tool for solidarity rather than surveillance. Panellists share stories from the frontlines of human rights work and discuss what builders need to understand about the communities they serve.",
    start: t(12, 0),
    end: t(13, 0),
    venue: "Bread Cube",
    type: "Roundtable",
    track: "Community & Culture",
    speakers: [
      { email: "gilberto.morishaw@demo.example", role: "Moderator" },
      { email: "cassandra.thornton@demo.example", role: "Panelist" },
      { email: "grayson.earle@demo.example", role: "Panelist" },
      { email: "kat.young@demo.example", role: "Panelist" },
    ],
  },
  // ── 15:00 ──
  {
    title: "Collective Worldbuilding through Speculative Fiction",
    description: "A participatory workshop where participants co-create fictional worlds that embody the values of decentralisation, mutual aid, and ecological stewardship. Through collaborative storytelling, we explore what just futures might look like.",
    start: t(13, 0),
    end: t(13, 40),
    venue: "Design Space",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [{ email: "fotis.tsiroukis@demo.example", role: "Facilitator" }],
  },
  {
    title: "Privacy by Design",
    description: "A practical workshop on integrating privacy considerations from the start of the design process. Eileen shares frameworks, tools, and case studies for building privacy-preserving products that people actually want to use.",
    start: t(13, 0),
    end: t(13, 40),
    venue: "Workshop Cube",
    type: "Workshop",
    track: "Privacy & Identity",
    speakers: [{ email: "eileen.wagner@demo.example" }],
  },
  {
    title: "DWeb Pop-Up Programming",
    description: "A curated series of short presentations and demos from the DWeb community. See the latest tools, platforms, and experiments in decentralised web technology.",
    start: t(13, 0),
    end: t(14, 0),
    venue: "DWeb Terrace",
    type: "Activation",
    track: "Infrastructure & Tech",
    speakers: [],
  },
  {
    title: "Interfaces of Resilience: Visual designs for Solidarity",
    description: "How can visual design serve as a tool for solidarity? This session brings together designers who create visual systems for social movements, exploring how aesthetics can strengthen collective action.",
    start: t(13, 0),
    end: t(13, 40),
    venue: "Bread Cube",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [
      { email: "catherine.schmidt@demo.example" },
      { email: "ruben.russel@demo.example" },
      { email: "rade.stijovic@demo.example" },
    ],
  },
  // ── 15:30 / 16:00 ──
  {
    title: "Value Creation as Collective Practice",
    description: "An exploration of how open-source communities and commons-based projects create, measure, and distribute value. Stina challenges conventional metrics and proposes alternative frameworks for recognising collective contribution.",
    start: t(13, 30),
    end: t(14, 0),
    venue: "Einkeller",
    type: "Lightning Talk",
    track: "Governance & Economics",
    speakers: [{ email: "stina.gustafsson@demo.example" }],
  },
  {
    title: "Vibecoding Governance",
    description: "Can you encode a community's vibe into its governance protocol? Oliver presents a provocative framework for translating intangible community values into on-chain decision-making mechanisms.",
    start: t(14, 0),
    end: t(14, 30),
    venue: "Einkeller",
    type: "Lightning Talk",
    track: "Governance & Economics",
    speakers: [{ email: "oliver.beige@demo.example" }],
  },
  {
    title: "Protocol Governance & Cryptoeconomic Design",
    description: "A deep-dive roundtable on the state of protocol governance. Four practitioners share lessons from building and governing decentralised protocols, covering token design, voting mechanisms, and the human dynamics that make or break governance systems.",
    start: t(14, 0),
    end: t(15, 0),
    venue: "Einkeller",
    type: "Roundtable",
    track: "Governance & Economics",
    speakers: [
      { email: "joshua.davila@demo.example", role: "Moderator" },
      { email: "oliver.beige@demo.example", role: "Panelist" },
      { email: "theo.beutel@demo.example", role: "Panelist" },
      { email: "jake.hartnell@demo.example", role: "Panelist" },
    ],
  },
  {
    title: "Multispecies Speculative Design",
    description: "What if we designed technology with non-human stakeholders in mind? Rita presents a framework for multispecies design thinking that considers ecological relationships as first-class design constraints.",
    start: t(14, 0),
    end: t(14, 40),
    venue: "Design Space",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [{ email: "rita.palma@demo.example", role: "Facilitator" }],
  },
  {
    title: "Brand Lab, or reverse-engineering your project\u2019s reputation (no design skills required)",
    description: "A hands-on workshop for open-source and decentralised projects to understand and shape their brand. Ira guides participants through reverse-engineering their project's reputation to build authentic, compelling identities.",
    start: t(14, 0),
    end: t(15, 0),
    venue: "Workshop Cube",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [{ email: "ira.nezhynska@demo.example", role: "Facilitator" }],
  },
  // ── 16:00 / 17:00 ──
  {
    title: "Microsolidarity: Whatever the Question, Community is the Answer",
    description: "An interactive session exploring microsolidarity — the practice of building mutual support in small groups. Participants experience the core practices and discuss how tiny acts of solidarity scale into systemic change.",
    start: t(14, 0),
    end: t(14, 40),
    venue: "Bread Cube",
    type: "Workshop",
    track: "Community & Culture",
    speakers: [],
  },
  {
    title: "Platform State and Digital Public Infrastructure",
    description: "Closing keynote examining the relationship between states and digital platforms. How should democratic societies govern the platforms that increasingly mediate civic life? A call for digital public infrastructure as a public good.",
    start: t(15, 30),
    end: t(16, 0),
    venue: "Bread Cube",
    type: "Lightning Talk",
    track: "Governance & Economics",
    speakers: [],
  },
];

// ── Main seed function ───────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding demo schedule data...\n");

  // 1. Find the target event
  const event = await prisma.event.findFirst({
    where: { slug: EVENT_SLUG },
  });

  if (!event) {
    console.error(`❌ Event with slug "${EVENT_SLUG}" not found.`);
    console.error("   Create the event first, then re-run this script.");
    process.exit(1);
  }

  console.log(`📅 Target event: ${event.name} (${event.id})\n`);

  // 2. Seed venues
  console.log("🏢 Creating venues...");
  const venueMap = new Map<string, string>();
  for (const v of VENUES) {
    const venue = await prisma.scheduleVenue.upsert({
      where: { eventId_name: { eventId: event.id, name: v.name } },
      update: { order: v.order },
      create: { eventId: event.id, name: v.name, order: v.order },
    });
    venueMap.set(v.name, venue.id);
    console.log(`  ✅ ${v.name}`);
  }

  // 3. Seed session types
  console.log("\n🎨 Creating session types...");
  const typeMap = new Map<string, string>();
  for (const st of SESSION_TYPES) {
    const sessionType = await prisma.scheduleSessionType.upsert({
      where: { eventId_name: { eventId: event.id, name: st.name } },
      update: { color: st.color, order: st.order },
      create: { eventId: event.id, name: st.name, color: st.color, order: st.order },
    });
    typeMap.set(st.name, sessionType.id);
    console.log(`  ✅ ${st.name} (${st.color})`);
  }

  // 4. Seed tracks
  console.log("\n🏷️  Creating tracks...");
  const trackMap = new Map<string, string>();
  for (const tr of TRACKS) {
    const track = await prisma.scheduleTrack.upsert({
      where: { eventId_name: { eventId: event.id, name: tr.name } },
      update: { color: tr.color, order: tr.order },
      create: { eventId: event.id, name: tr.name, color: tr.color, order: tr.order },
    });
    trackMap.set(tr.name, track.id);
    console.log(`  ✅ ${tr.name} (${tr.color})`);
  }

  // 5. Seed speaker users + profiles
  console.log("\n👤 Creating speakers...");
  const userMap = new Map<string, string>(); // email → userId
  for (const sp of SPEAKERS) {
    const user = await prisma.user.upsert({
      where: { email: sp.email },
      update: { firstName: sp.firstName, surname: sp.surname },
      create: {
        email: sp.email,
        firstName: sp.firstName,
        surname: sp.surname,
      },
    });
    userMap.set(sp.email, user.id);

    // Upsert profile with bio, title, company
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: sp.bio,
        jobTitle: sp.jobTitle,
        company: sp.company,
      },
      create: {
        userId: user.id,
        bio: sp.bio,
        jobTitle: sp.jobTitle,
        company: sp.company,
      },
    });
    console.log(`  ✅ ${sp.firstName} ${sp.surname} — ${sp.jobTitle}, ${sp.company}`);
  }

  // 6. Seed sessions + session speakers
  console.log("\n📋 Creating sessions...");
  let sessionCount = 0;

  for (const sess of SESSIONS) {
    const venueId = venueMap.get(sess.venue);
    const typeId = typeMap.get(sess.type);
    const trackId = sess.track ? trackMap.get(sess.track) ?? null : null;

    if (!venueId) {
      console.warn(`  ⚠️  Venue "${sess.venue}" not found, skipping: ${sess.title}`);
      continue;
    }
    if (!typeId) {
      console.warn(`  ⚠️  Session type "${sess.type}" not found, skipping: ${sess.title}`);
      continue;
    }

    // Create session (delete existing with same title+time to allow re-running)
    const existing = await prisma.scheduleSession.findFirst({
      where: {
        eventId: event.id,
        title: sess.title,
        startTime: sess.start,
      },
    });

    let session;
    if (existing) {
      session = await prisma.scheduleSession.update({
        where: { id: existing.id },
        data: {
          description: sess.description,
          endTime: sess.end,
          venueId,
          sessionTypeId: typeId,
          trackId,
          isPublished: true,
        },
      });
    } else {
      session = await prisma.scheduleSession.create({
        data: {
          eventId: event.id,
          title: sess.title,
          description: sess.description,
          startTime: sess.start,
          endTime: sess.end,
          venueId,
          sessionTypeId: typeId,
          trackId,
          isPublished: true,
        },
      });
    }

    // Clear existing speakers for this session (idempotent)
    await prisma.sessionSpeaker.deleteMany({
      where: { sessionId: session.id },
    });

    // Add speakers
    for (let i = 0; i < sess.speakers.length; i++) {
      const sp = sess.speakers[i]!;
      const userId = userMap.get(sp.email);
      if (!userId) {
        console.warn(`  ⚠️  Speaker "${sp.email}" not found, skipping`);
        continue;
      }
      await prisma.sessionSpeaker.create({
        data: {
          sessionId: session.id,
          userId,
          role: sp.role ?? "Speaker",
          order: i,
        },
      });
    }

    sessionCount++;
    const speakerCount = sess.speakers.length;
    console.log(
      `  ✅ ${sess.title}${speakerCount > 0 ? ` (${speakerCount} speakers)` : ""}`,
    );
  }

  console.log(`\n🎉 Done! Seeded ${sessionCount} sessions across ${VENUES.length} venues.`);
  console.log(`   ${SPEAKERS.length} speakers with profiles created.`);
  console.log(`   ${SESSION_TYPES.length} session types, ${TRACKS.length} tracks.\n`);
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
