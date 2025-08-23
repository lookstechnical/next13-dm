import z from "zod";

export const step1 = z.object({
  email: z.email(),
});

export const step2 = z.object({
  email: z.email(),
  name: z.string(),
});

export const inviteRegistration = z.object({
  name: z.string().nonempty("Please Enter your Full Name"),
  position: z.string().nonempty("Please enter your preferred playing position"),
  secondaryPosition: z.string().optional(),
  dateOfBirth: z.string().nonempty("Please select the players Date of birth"),
  club: z.string().nonempty("Please Select the club you currently play for"),
  email: z.email(),
  mobile: z
    .string()
    .nonempty(
      "Please enter a mobile phone number to help us contact you in case of an emergency"
    ),
  avatar: z.file(
    "Please upload an image this will help our coaches identify you when you attend"
  ),
});
