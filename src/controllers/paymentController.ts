import crypto from "crypto";
import { Request, Response } from "express";
import * as https from "https";
import * as http from "http";
import { Transactions } from "../models/transaction";
import { dataSource } from "../data-source";
import { Doctor } from "../models/doctor";
import { Patient } from "../models/patient";
import { PaymentMethod } from "../models/paymentMethod";
import { create } from "domain";

const transactionRepository = dataSource.getRepository(Transactions);
const doctorRepository = dataSource.getRepository(Doctor);
const patientRepository = dataSource.getRepository(Patient);
const paymentMethodRepository = dataSource.getRepository(PaymentMethod);

const PAYSTACK_API_KEY = process.env.PAYSTACK_API_KEY as string;

// Create a new subscription plan
// export const createPlan = async (req: Request, res: Response) => {
//   const { name, amount, interval } = req.body;

//   const params = JSON.stringify({
//     name,
//     interval,
//     amount,
//   });

//   const options: https.RequestOptions = {
//     hostname: "api.paystack.co",
//     port: 443,
//     path: "/plan",
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${PAYSTACK_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//   };

//   const paystackRequest = https
//     .request(options, (paystackRes: http.IncomingMessage) => {
//       let data = "";

//       paystackRes.on("data", (chunk: string) => {
//         data += chunk;
//       });

//       paystackRes.on("end", () => {
//         const responseData = JSON.parse(data);
//         res.json(responseData);
//       });
//     })
//     .on("error", (error: Error) => {
//       console.error(error);
//       res.status(500).json({ error: "An error occurred" });
//     });

//   paystackRequest.write(params);
//   paystackRequest.end();
// };

// Initiate payment
export const initiatePayment = async (req: Request, res: Response) => {
  const { currency, amount } = req.body;

  const patient = await patientRepository.findOne({
    where: { id: req["userId"] },
  });

  if (!patient) {
    return res.status(404).json({
      status: false,
      error: "User not found",
    });
  }

  const requestData = {
    email: patient.email,
    amount: amount * 100,
    currency,
  };

  const params = JSON.stringify(requestData);

  const options: https.RequestOptions = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transaction/initialize",
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  const paystackRequest = https
    .request(options, (paystackRes: http.IncomingMessage) => {
      let data = "";

      paystackRes.on("data", (chunk: string) => {
        data += chunk;
      });

      paystackRes.on("end", async () => {
        const responseData = JSON.parse(data);

        res.json(responseData);
      });
    })
    .on("error", (error: Error) => {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    });

  paystackRequest.write(params);
  paystackRequest.end();
};

// Paystack Webhook
// export const paystackWebhook = async (req: Request, res: Response) => {
//   const hash = crypto
//     .createHmac("sha512", process.env.WEBHOOK_SECRET as string)
//     .update(JSON.stringify(req.body))
//     .digest("hex");

//   console.log(req.body);

//   if (hash === req.headers["x-paystack-signature"]) {
//     console.log(true);
//     const eventData = req.body;
//     if (eventData.event === "charge.success") {
//       try {
//         const verifyResponse = await verifyPayment(eventData.data.reference);

//         if (verifyResponse && verifyResponse.data.status === "success") {
//           const transaction = await transactionRepository.create({
//             reference: verifyResponse.data.reference,
//             amount: verifyResponse.data.amount,
//             currency: verifyResponse.data.currency,
//             channel: verifyResponse.data.channel,
//             status: verifyResponse.data.status,
//           });

//           await transactionRepository.save(transaction);

//           console.log(
//             "Payment successfully verified and stored:",
//             eventData.data.reference
//           );
//         } else {
//           console.error("Payment verification failed");
//         }
//       } catch (error) {
//         console.error("Error storing or verifying payment:", error);
//       }
//     }
//   }
//   res.sendStatus(200);
// };

// Verify payment
export const verifyPayment = (reference: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const response = JSON.parse(data);
        resolve(response);
      });
    });

    req.on("error", (error) => {
      console.error(error);
      reject(error);
    });

    req.end();
  });
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { reference, doctorId } = req.body;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
    });

    const transaction = await transactionRepository.findOne({
      where: { reference },
    });

    if (transaction) {
      return res.status(400).json({
        status: false,
        message: "Transaction already exists",
      });
    }

    const verifyResponse = await verifyPayment(reference);

    if (verifyResponse && verifyResponse.data.status === "success") {
      const transaction = transactionRepository.create({
        reference: verifyResponse.data.reference,
        amount: verifyResponse.data.amount / 100,
        currency: verifyResponse.data.currency,
        channel: verifyResponse.data.channel,
        status: verifyResponse.data.status,
        patient,
        doctor,
        type: "payment",
      });

      await transactionRepository.save(transaction);

      const data = {
        reference: verifyResponse.data.reference,
        type: transaction.type,
        amount: verifyResponse.data.amount / 100,
        currency: verifyResponse.data.currency,
        channel: verifyResponse.data.channel,
        status: verifyResponse.data.status,
        doctor: {
          id: doctor?.id,
          firstName: doctor?.firstName,
          lastName: doctor?.lastName,
        },
        patient: {
          id: patient?.id,
          firstName: patient?.firstName,
          lastName: patient?.lastName,
        },
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };

      res.status(201).json({
        status: true,
        message: "Payment successfully verified and stored",
        data,
      });
    } else {
      res.status(400).json({
        status: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    res.status(400).json({
      status: false,
      error: error.message,
    });
  }
};

// Withdrawal
export const withdraw = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        error: "User not found",
      });
    }

    if (doctor.balance < amount) {
      return res.status(400).json({
        status: false,
        error: "Insufficient balance",
      });
    }

    const transaction = transactionRepository.create({
      amount,
      doctor,
      status: "pending",
    });

    await transactionRepository.save(transaction);

    doctor.balance -= amount;
    await doctorRepository.save(doctor);

    res.status(201).json({
      status: true,
      message: "Withdrawal successful",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      error: error.message,
    });
  }
};

// Verify Withdrawal
export const verifyWithdrawal = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        error: "User not found",
      });
    }
  } catch (error) {}
};

// const createTransferRecipient = (data: any, code: any) => {
//   const params = JSON.stringify({
//     type: "{data.paymentMethod.type}",
//     name: `${data.firstName} ${data.lastName}`,
//     account_number: `${data.paymentMethod.accountNumber}`,
//     bank_code: `${code}`,
//     currency: "GHS",
//   });

//   const options: https.RequestOptions = {
//     hostname: "api.paystack.co",
//     port: 443,
//     path: "/transferrecipient",
//     method: "POST",
//     headers: {
//       Authorization: "Bearer SECRET_KEY",
//       "Content-Type": "application/json",
//     },
//   };

//   const req = https
//     .request(options, (res: http.IncomingMessage) => {
//       let data = "";

//       res.on("data", (chunk: any) => {
//         data += chunk;
//       });

//       res.on("end", () => {
//         return JSON.parse(data).data.recipient_code;
//       });
//     })
//     .on("error", (error: Error) => {
//       console.error(error);
//     });

//   req.write(params);
//   req.end();
// };

const createTransferRecipient = async (data, code) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      type: data.paymentMethod.type,
      name: `${data.firstName} ${data.lastName}`,
      account_number: data.paymentMethod.accountNumber,
      bank_code: code,
      currency: "GHS",
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transferrecipient",
      method: "POST",
      headers: {
        Authorization: process.env.PAYSTACK_API_KEY,
        "Content-Type": "application/json",
      },
    };

    const req = https
      .request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          const recipientCode = JSON.parse(responseData).data.recipient_code;
          resolve(recipientCode as string);
        });
      })
      .on("error", (error) => {
        console.error(error);
        reject(error);
      });

    req.write(params);
    req.end();
  });
};

export const initiateWithdrawal = async (req: Request, res: Response) => {
  const transactionId = req.params.id;
  const { amount, code } = req.body;

  const transaction = await transactionRepository.findOne({
    where: { id: transactionId },
    relations: ["doctor"],
  });

  const doctor = await doctorRepository.findOne({
    where: { id: transaction.doctor.id },
    relations: ["paymentMethod"],
  });

  const method = await paymentMethodRepository.findOneBy({
    doctor: {
      id: transaction.doctor.id,
    },
    isDefault: true,
  });

  if (method.reference === null) {
    const recepient = await createTransferRecipient(doctor,code) as unknown as string;
    method.reference = recepient;

    await paymentMethodRepository.save(method);
  }

  const params = JSON.stringify({
    source: "balance",
    reason: "Withdrawal",
    amount,
    recipient: method.reference,
  });

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transfer",
    method: "POST",
    headers: {
      Authorization: process.env.PAYSTACK_API_KEY,
      "Content-Type": "application/json",
    },
  };

  const reQ = https
    .request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", async () => {
        transaction.status = "success";
        await transactionRepository.save(transaction);

        res.status(200).json({
          status: true,
          message: "Withdrawal successful",
          data: JSON.parse(data),
        });
      });
    })
    .on("error", (error) => {
      console.error(error);
    });

  reQ.write(params);
  reQ.end();
};

// List banks
export const listBanks = (req, res) => {
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/bank?country=ghana",
    method: "GET",
    headers: {
      Authorization: process.env.PAYSTACK_API_KEY,
    },
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      res.status(200).json({
        status: true,
        data: JSON.parse(data),
      });
    });
  });

  request.on("error", (error) => {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "An error occurred while fetching data from Paystack",
    });
  });

  request.end();
};

// List mobile money providers
export const listMobileMoney = (req, res) => {
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/bank?currency=GHS&type=mobile_money",
    method: "GET",
    headers: {
      Authorization: process.env.PAYSTACK_API_KEY,
    },
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      res.status(200).json({
        status: true,
        data: JSON.parse(data),
      });
    });
  });

  request.on("error", (error) => {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "An error occurred while fetching data from Paystack",
    });
  });

  request.end();
};
