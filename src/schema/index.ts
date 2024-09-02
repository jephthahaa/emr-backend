import { z } from 'zod';

export type IDoctor = {
  notifications: {
    email: boolean;
    status: boolean;
    records: boolean;
    messages: boolean;
    appointments: boolean;
  };
  email: string;
  dob: string;
  firstName: string;
  lastName: string;
  gender: string;
  contact: string;
  address: string;
  city: string;
  qualifications: string[];
  specializations: string[];
  experience: number;
  education: string[];
  bio: string;
  languages: string[];
  awards: string[];
  rate: {
    amount: number;
    lengthOfSession: number;
  };
  schoolsAttended: string[];
};

const notificationsSchema = z.object({
  email: z.boolean({
    required_error: "Email notifications are required",
  }),
  status: z.boolean({
    required_error: "Status notifications are required",
  }),
  records: z.boolean({
    required_error: "Records notifications are required",
  }),
  messages: z.boolean({
    required_error: "Messages notifications are required",
  }),
  appointments: z.boolean({
    required_error: "Appointments notifications are required",
  }),
});

export const updateDoctorSchema = z
  .object({
    notifications: notificationsSchema,
    email: z.string().email(),
    dob: z.string().min(4),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    gender: z.string().min(2),
    contact: z.string().min(2),
    address: z.string().min(2),
    city: z.string().min(2),
    qualifications: z.array(z.string().min(2)),
    specializations: z.array(z.string().min(2)),
    experience: z.number(),
    education: z.array(z.object({
      degree: z.string(),
      school: z.string(),
    })),
    bio: z.string(),
    languages: z.array(z.string().min(2)),
    awards: z.array(z.string().min(2)),
    rate: z.object({
      amount: z.number({
        required_error: "Rate amount is required",
      }),
      lengthOfSession: z.number({
        required_error: "Length of session is required",
      }),
    }),
    schoolsAttended: z.array(z.string().min(2)),
  })
  .partial();


export const updatePatientSchema = z
.object({
  notifications: z.object({
    email: z.boolean({
      required_error: "Email notifications are required",
    }),
    status: z.boolean({
      required_error: "Status notifications are required",
    }),
    records: z.boolean({
      required_error: "Records notifications are required",
    }),
    messages: z.boolean({
      required_error: "Messages notifications are required",
    }),
    appointments: z.boolean({
      required_error: "Appointments notifications are required",
    }),
  }),
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  gender: z.string().min(2),
  contact: z.string().min(2),
  address: z.string().min(2),
  dob: z.string().min(4),
  city: z.string().min(2),
  insuranceInfo: z.object({
    provider: z.string(),
  }),
  maritalStatus: z.string(),
  denomination: z.string(),
  bloodGroup: z.string(),
  height: z.number(),
  weight: z.number(),
  temperature: z.number(),
  bloodPressure: z.object({
    systolic: z.number(),
    diastolic: z.number(),
  }),
  bloodSugarLevel: z.number(),
  heartRate: z.number(),
  lifestyle: z.object({
    occupation: z.string(),
    parents: z.object({
      maritalStatus: z.string(),
      livingStatus: z.string(),
      married: z.boolean(),
    }),
    stress: z.number(),
    additionalNotes: z.string(),
    socialHistory: z.string(),
    alcohol: z.object({
      status: z.string(),
      yearsOfDrinking: z.number(),
    }),
    smoking: z.object({
      status: z.string(),
      yearsOfSmoking: z.number(),
    }),
    familyHistory: z.string(),
  }),
})
.partial();


export const createAppointmentRequestSchema = z.object({
  slotId: z.string({
    required_error: "Slot ID is required",
  }).min(3),
  reason: z.string({
    required_error: "Reason for appointment is required",
  }),
  notes: z.string().optional(),
});

export const cancelAppointmentRequestSchema = z.object({
  requestId: z.number({
    required_error: "request Id is required",
  }),
  slotId: z.string({required_error: "slotId is required"}),
  keepSlot: z.boolean().default(false)
})

export const paginationQueryParams = z.object({
  limit: z.coerce.number().int().default(25),
  page: z.coerce.number().int().default(1),
  search: z.string().default(""),
});

export const findDoctorsQueryParams = z.object({
  limit: z.coerce.number().int().default(25),
  page: z.coerce.number().int().default(1),
  search: z.string().default(""),
  sort: z.string().default(""),
  speciality: z.string().default(""),
  maxPrice: z.coerce.number().default(300),
  minPrice: z.coerce.number().default(20),
  maxStar: z.coerce.number().default(5),
  minStar: z.coerce.number().default(0),
  location: z.string().default(""),
  gender: z.string().default(""),
  language: z.string().default(""),
})

export const appointmentRequestParams = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  sort: z.string().optional(),
})

export const issuesFeedbackParams = z.object({
  userType: z.enum(["patient", "doctor"]).optional(),
  sort: z.string().optional().default(""),
  type: z.string().optional().default("")
})

export const doctorPatientsParams = z.object({
  gender: z.string().optional(),
  sort: z.string().optional(),
  consult: z.string().optional(),
})

export const paymentMethodSchema = z.object({
  card: z.object({
    cardNumber: z.string().default(""),
    nameOnCard: z.string().default(""),
  }).default({
    cardNumber: "",
    nameOnCard: ""
  }),
  mobile: z.object({
    mobileMoneyNumber: z.string().default(""),
    mobileMoneyProvider: z.string().default(""),
    mobileMoneyName: z.string().default(""),
  }).default({
    mobileMoneyName: "",
    mobileMoneyNumber: "",
    mobileMoneyProvider: ""
  }),
}).partial();

export const ReviewSchema = z.object({
  // status: z.enum(["pending", "skipped", "complete"]).default("pending"),
  rating: z.number().default(0),
  comment: z.string(),
  communicationSkill: z.object({
    isProfessional: z.string(),
    isClear: z.number(),
    isAttentive: z.string(),
    isComfortable: z.string(),
  }),
  expertise: z.object({
    knowledge: z.number(),
    thorough: z.string(),
    confidence: z.number(),
    helpful: z.string(),
  }),
}).partial();

export const SymptomsSchema = z.object({
  name: z.string({
    required_error: "name is required",
  }),
  type: z.string({
    required_error: "type is required",
  }),
});

export const IcdsSchema = z.object({
  name: z.string({
    required_error: "name is required",
  }),
  code: z.string({
    required_error: "code is required",
  }),
});

export const MedicineSchema = z.object({
  name: z.string({
    required_error: "name is required",
  }),
  description: z.string().optional()
});

export const IssuesSchema = z.object({
  name: z.string({
    required_error: "name is required",
  }),
  description: z.string({
    required_error: "description is required"
  })
});

export const FeedbackSchema = z.object({
  type: z.string({
    required_error: "type is required",
  }),
  comment: z.string({
    required_error: "comment is required"
  })
});

export default ReviewSchema;
