import { FindOptionsOrder } from "typeorm";
import { AppointmentRequest } from "../models/appointment-request";
import { Patient } from "../models/patient";
import { Doctor } from "../models/doctor";
import { Appointment } from "../models/appointment";
import { Transactions } from "../models/transaction";
import { Symptoms } from "../models/sympoms";
import { Icds } from "../models/icds";

export function getWeekStartandEnd(today: Date): {
  startOfWeek: Date;
  endOfWeek: Date;
} {
  const currentDay = today.getDate();
  const currentWeekday = today.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6

  const monday = new Date(today);
  monday.setDate(currentDay - currentWeekday + (currentWeekday === 0 ? -6 : 1)); // Adjust for Sunday

  const currentDate = new Date(monday.setHours(0, 0, 0, 0));
  const sunday = new Date(monday.setHours(23, 59, 59, 0));
  sunday.setDate(monday.getDate() + 6);

  return { startOfWeek: currentDate, endOfWeek: sunday };
}


export function updateProperties(source, target) {
  for (let key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) {
        target[key] = {};
      }
      updateProperties(source[key], target[key]);
    } else {
      target[key] = source[key];
    }
  }
}

export function mergeDeep(target, source) {
  const isObject = (obj) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}

export function mergeMultiple<T extends Record<string, any>>(...any: any[]) {
  let obj: T = {} as T;

  if (any.length === 1 && Array.isArray(any[0])) {
    const arr = any[0];
    for (let i = 0; i < arr.length; i++) {
      obj = mergeDeep(obj, arr[i]);
    }
  } else {
    for (let i = 0; i < any.length; i++) {
      obj = mergeDeep(obj, any[i]);
    }
  }

  return obj;
}

export function appointmentRequestSort(sort = "."): FindOptionsOrder<AppointmentRequest>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    case "name":
      return {
        patient: {
          firstName: order,
          lastName: order,
        }
      };
    case "date":
      return {
        appointmentSlot: {
          date: order,
        },
      };
    case "status":
      return {
        status: order
      };
    case "type":
      return {
        appointmentSlot: {
          type: order
        }
      };
  
    default:
      return {
        appointmentSlot: {
          date: order,
        },
      }
  }
}


export function appointmentSort(sort = "."): FindOptionsOrder<Appointment>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    case "date":
      return {
        appointmentDate: order,
      };
    case "status":
      return {
        status: order
      };
    case "type":
      return {
          type: order
      };
  
    default:
      return {
        appointmentDate: order,
      };
  }
}

export function transactionsSort(sort = "."): FindOptionsOrder<Transactions>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    case "date":
      return {
        createdAt: order,
      };
    case "status":
      return {
        status: order
      };
    case "type":
      return {
        type: order
      };
  
    default:
      return {
        createdAt: order,
      };
  }
}

export function doctorSort(sort = "."): (a: Doctor, b: Doctor) => number {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    case "name":
      return (a, b) => order === "ASC" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    case "consult":
      return (a, b) => order === "ASC" ? a["recentConsultDate"] - b["recentConsultDate"] : b["recentConsultDate"] - a["recentConsultDate"];
    case "status":
      return (a, b) => order === "ASC" ? a.verification_status.localeCompare(b.verification_status) : b.verification_status.localeCompare(a.verification_status);
  
    default:
      return (a, b) => order === "ASC" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    }
}

export function patientSort(sort = "."): (a: Patient, b: Patient) => number {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    case "name":
      return (a, b) => order === "ASC" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    case "consult":
      return (a, b) => order === "ASC" ? a["recentConsultDate"] - b["recentConsultDate"] : b["recentConsultDate"] - a["recentConsultDate"];
    case "gender":
      return (a, b) => order === "ASC" ? a.gender.localeCompare(b.gender) : b.gender.localeCompare(a.gender);
  
    default:
      return (a, b) => order !== "ASC" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    }
}

export function consultFilter(consult: string | undefined) {
  switch (consult) {
    case "none":
      return (user: any) => user["recentConsultDate"] === null;
    case "had":
      return (user: any) => user["recentConsultDate"] !== null;
    default:
      return (user: any) => true;
  }
}

export function doctorPatientsSort(sort = "."): FindOptionsOrder<Patient>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["date", "DESC"];

  switch (field) {
    // case "date":
    //   return {
    //     records: {
    //       createdAt: order,
    //     }
    //   };
    case "name":
      return {
        firstName: order,
        lastName: order,
      };
    case "gender":
      return {
        gender: order
      };
    
    default:
      return undefined;
  }
}

export function doctorsSort(sort = "."): (a: Doctor, b: Doctor) => number {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["rating", "DESC"];

  switch (field) {
    case "name":
      return (a, b) => order === "ASC" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    case "rating":
      return (a, b) => order === "ASC" ? a["ratings"] - b["ratings"] : b["ratings"] - a["ratings"];
    case "experience":
      return (a, b) => order === "ASC" ? a.experience - b.experience : b.experience - a.experience;
    case "consultations":
      return (a, b) => order === "ASC" ? a['noOfConsultations'] - b['noOfConsultations'] : b['noOfConsultations'] - a['noOfConsultations'];
    case "price":
      return (a, b) => order === "ASC" ? a.rate.amount - b.rate.amount : b.rate.amount - a.rate.amount;
    default:
      return (a, b) => order === "ASC" ? a["ratings"] - b["ratings"] : b["ratings"] - a["ratings"];
  }
}

export function symptomsSort(sort = "."): FindOptionsOrder<Symptoms>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["name", "DESC"];

  switch (field) {
    case "name":
      return {
        name: order,
      };
    case "type":
      return {
          type: order
      };
  
    default:
      return {
        name: order,
      };
  }
}

export function icdsSort(sort = "."): FindOptionsOrder<Icds>  {
  const [field, order] = sort.split(".") as [string, "ASC" | "DESC"] ?? ["name", "DESC"];

  switch (field) {
    case "name":
      return {
        name: order,
      };
    case "code":
      return {
          code: order
      };

    default:
      return {
        name: order,
      };
  }
}

const icdsSortMapping = {
  name: "name",
  data: "data"
} as const;

// Generic function to create a sort order for any entity
export function createSortOrder<T>(sort: string, sortMapping: Record<string, keyof T>, defaultSort: { field: keyof T, order: "ASC" | "DESC" }): FindOptionsOrder<T> {
  const [field, order] = (sort ?? `${String(defaultSort.field)}.${defaultSort.order}`).split(".") as [string, "ASC" | "DESC"];
  const databaseField = sortMapping[field];

  // If the sort field is valid and mapped, return the corresponding order
  if (databaseField && (order === "ASC" || order === "DESC")) {
    return { [databaseField]: order } as FindOptionsOrder<T>;
  }

  // Fallback to default sort if the provided sort parameter is not valid
  return { [defaultSort.field]: defaultSort.order } as FindOptionsOrder<T>;
}