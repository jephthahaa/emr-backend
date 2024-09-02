import { dataSource } from "../data-source";
import { Record } from "../models/record";

const recordRepository = dataSource.getRepository(Record);

export default async function AutoCloseConsultations(now: Date) {
  try {
    const activeRecords = await recordRepository.find({
      where: {
        status: "active",
      },
      relations: { doctor: true },
    });

    for (const record of activeRecords) {
      const timeDiff = now.getTime() - record.createdAt.getTime();
      const hours = timeDiff / 1000 / 60 / 60;

      if (hours >= 2.5) {
        record.status = "ended";
        record.reasonEnded = "auto";
        await recordRepository.save(record);
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}