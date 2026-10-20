// Education form ke liye lists. Ye starter lists hain, baad mein badhai ja sakti hain.

export const OTHER_INSTITUTION_LABEL = "Other (my college/university isn't listed)";

export const EDUCATION_LEVELS = [
  { value: "10th", label: "10th pass" },
  { value: "12th", label: "12th pass" },
  { value: "graduation", label: "Graduation" },
  { value: "masters", label: "Masters (Post graduation)" },
  { value: "phd", label: "PhD" },
];

// Kaun sa level chunne par kaun-kaun se sections dikhane hain
export const LEVEL_ORDER = ["10th", "12th", "graduation", "masters", "phd"];

export const DEGREES = {
  graduation: [
    "B.Tech", "B.E.", "B.Sc", "B.Com", "B.A.", "BBA", "BCA", "B.Pharm", "B.Arch", "B.Des",
    "BFA", "LLB", "B.Ed", "BHM", "B.Sc Nursing", "MBBS", "BDS", "BAMS", "BHMS", "B.Voc",
    "Diploma",
  ],
  masters: [
    "M.Tech", "M.E.", "M.Sc", "M.Com", "M.A.", "MBA", "PGDM", "MCA", "M.Pharm", "M.Arch",
    "M.Des", "MFA", "LLM", "M.Ed", "MS", "MD", "MDS", "MSW",
  ],
  phd: ["PhD", "Integrated PhD", "D.Sc", "D.Litt", "Post-Doctoral"],
};

export const BOARDS = [
  "CBSE", "ICSE / ISC (CISCE)", "NIOS", "UP Board", "Bihar Board (BSEB)",
  "Maharashtra State Board", "Rajasthan Board (RBSE)", "MP Board (MPBSE)", "Gujarat Board (GSEB)",
  "Haryana Board (HBSE)", "Punjab Board (PSEB)", "West Bengal Board", "Tamil Nadu State Board",
  "Karnataka Board", "Kerala Board", "Andhra Pradesh Board", "Telangana Board", "Odisha Board",
  "Jharkhand Board (JAC)", "Uttarakhand Board (UBSE)", "Himachal Board (HPBOSE)",
  "J&K Board (JKBOSE)", "Assam Board", "Chhattisgarh Board (CGBSE)",
  "International Baccalaureate (IB)", "Cambridge (IGCSE)", "Other State Board",
];

export const STREAMS = [
  "Computer Science", "Information Technology", "Electronics and Communication", "Electrical",
  "Mechanical", "Civil", "Chemical", "Biotechnology", "Aerospace", "Automobile",
  "Artificial Intelligence and Machine Learning", "Data Science", "Cyber Security",
  "Commerce", "Accounting and Finance", "Economics", "Business Administration", "Marketing",
  "Human Resources", "International Business", "Banking and Insurance",
  "Arts", "English", "Hindi", "History", "Political Science", "Sociology", "Psychology",
  "Philosophy", "Geography", "Journalism and Mass Communication", "Fine Arts", "Design",
  "Fashion Design", "Architecture", "Physics", "Chemistry", "Mathematics", "Statistics",
  "Biology", "Botany", "Zoology", "Microbiology", "Environmental Science", "Agriculture",
  "Horticulture", "Veterinary Science", "Medicine", "Dentistry", "Pharmacy", "Nursing",
  "Physiotherapy", "Public Health", "Law", "Education", "Hotel Management", "Tourism",
  "Library Science", "Social Work", "Sports Science", "Other",
];

export const INSTITUTIONS = [
  // IITs
  "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur", "IIT Roorkee",
  "IIT Guwahati", "IIT Hyderabad", "IIT (BHU) Varanasi", "IIT Indore", "IIT Ropar", "IIT Patna",
  "IIT Bhubaneswar", "IIT Gandhinagar", "IIT Jodhpur", "IIT Mandi", "IIT (ISM) Dhanbad",
  // NITs
  "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Rourkela", "NIT Calicut",
  "MNNIT Allahabad", "NIT Kurukshetra", "NIT Jalandhar", "NIT Delhi", "NIT Durgapur",
  "NIT Silchar", "NIT Patna", "MNIT Jaipur", "VNIT Nagpur", "SVNIT Surat", "MANIT Bhopal",
  // IIITs
  "IIIT Hyderabad", "IIIT Delhi", "IIIT Bangalore", "IIIT Allahabad", "ABV-IIITM Gwalior",
  "IIIT Lucknow",
  // Top institutes
  "Indian Institute of Science (IISc) Bangalore", "IIM Ahmedabad", "IIM Bangalore",
  "IIM Calcutta", "IIM Lucknow", "IIM Indore", "IIM Kozhikode", "XLRI Jamshedpur",
  "FMS Delhi", "SPJIMR Mumbai", "MDI Gurgaon", "ISB Hyderabad", "AIIMS New Delhi",
  "JIPMER Puducherry", "CMC Vellore",
  // Universities
  "Delhi University", "Jawaharlal Nehru University (JNU)", "Jamia Millia Islamia",
  "Banaras Hindu University (BHU)", "Aligarh Muslim University (AMU)",
  "University of Allahabad", "University of Lucknow",
  "Chaudhary Charan Singh University (CCSU) Meerut",
  "Dr. A.P.J. Abdul Kalam Technical University (AKTU)", "University of Mumbai",
  "Savitribai Phule Pune University", "Anna University", "University of Madras",
  "University of Calcutta", "Jadavpur University", "Osmania University",
  "University of Hyderabad", "Bangalore University", "Panjab University",
  "Guru Gobind Singh Indraprastha University (GGSIPU)",
  "Netaji Subhas University of Technology (NSUT)", "Delhi Technological University (DTU)",
  "IGDTUW Delhi", "IGNOU", "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
  "Gujarat Technological University (GTU)", "Visvesvaraya Technological University (VTU)",
  "Maulana Abul Kalam Azad University of Technology (MAKAUT)",
  "JC Bose University of Science and Technology YMCA", "Maharshi Dayanand University (MDU) Rohtak",
  "Kurukshetra University", "Gautam Buddha University", "Jamia Hamdard",
  // Private universities
  "BITS Pilani", "VIT Vellore", "SRM Institute of Science and Technology",
  "Manipal Academy of Higher Education", "Amity University", "Lovely Professional University (LPU)",
  "Chandigarh University", "Thapar Institute of Engineering and Technology",
  "Symbiosis International University", "Christ University", "NMIMS Mumbai",
  "Shiv Nadar University", "Ashoka University", "Bennett University", "Sharda University",
  "Galgotias University", "Jaypee Institute of Information Technology (JIIT) Noida",
  "KIIT University", "Amrita Vishwa Vidyapeetham", "SASTRA University",
  "BIT Mesra", "Bharati Vidyapeeth", "MIT World Peace University", "Presidency University",
  // Colleges
  "ABES Engineering College", "KIET Group of Institutions",
  "Ajay Kumar Garg Engineering College (AKGEC)", "GL Bajaj Institute of Technology and Management",
  "IMS Ghaziabad", "St. Stephen's College Delhi", "Hindu College Delhi", "Miranda House Delhi",
  "SRCC Delhi", "Lady Shri Ram College for Women", "Hansraj College",
  "Loyola College Chennai", "Madras Christian College", "St. Xavier's College Mumbai",
  "St. Xavier's College Kolkata", "Fergusson College Pune", "Mount Carmel College Bangalore",
];