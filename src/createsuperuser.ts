import prompt from "prompt-sync";
import bcryptjs from "bcryptjs";
import { dataSource } from "./data-source";
import { Admin } from "./models/admin";
import { Repository } from "typeorm";

dataSource
  .initialize()
  .then(() => {
    const adminRepository: Repository<Admin> = dataSource.getRepository(Admin);
    const promptSync = prompt();

    const getEmail = async (): Promise<string> => {
      let email: string = promptSync("Email: ");

      if (email.trim() === "") {
        console.log("Email cannot be empty");
        return getEmail();
      }

      const userExists = await adminRepository.findOne({ where: { email } });

      if (userExists) {
        console.log("Email already in use");
        return getEmail();
      }

      return email;
    };

    const getPassword = (): string => {
      let password: string = promptSync("Password: ", { echo: "*" });

      if (password.trim() === "") {
        console.log("Password cannot be empty");
        return getPassword();
      }

      const getconfirmPassword = (): string => {
        let confirmPassword: string = promptSync("Confirm Password: ", { echo: "*" });

        if (password !== confirmPassword) {
          console.log("Passwords do not match");
          return getconfirmPassword();
        }

        return confirmPassword;
      };

      return getconfirmPassword();
    };

    const createSuperUser = async (): Promise<void> => {
      let email: string = await getEmail();
      let password: string = await getPassword();

      try {
        const admin: Admin = adminRepository.create({
          email,
          password: await bcryptjs.hash(password, 12),
        });

        await adminRepository.save(admin);
        console.log("Superuser successfully created...");
      } catch (error) {
        console.log(error);
      } finally {
        process.exit();
      }
    };

    createSuperUser();
  })
  .catch((error) => {
    console.log('Error during Data Source initialization:\n', error);
  });
