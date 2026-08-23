import z from "zod";

export const step1 = z.object({
  email: z.email(),
});

// step2 used to be a fixed schema here: email + name + position + club. The
// programme registration form is now configurable per programme, so what's
// required depends on the row — see validateProfileFields in
// app/routes/programmes_.$url_.register.tsx and the defaults in
// app/utils/programme-fields.ts, which reproduce exactly this old set.

export const inviteRegistration = z
  .object({
    name: z.string().nonempty("Please Enter your Full Name"),
    position: z
      .string()
      .nonempty("Please enter your preferred playing position"),
    secondaryPosition: z.string().optional(),
    dateOfBirth: z.string().nonempty("Please select the players Date of birth"),
    club: z.string().nonempty("Please Select the club you currently play for"),
    shirt: z
      .string()
      .nonempty("Please select shirt size for training/playing kit"),
    shorts: z
      .string()
      .nonempty("Please select shorts size for training/playing kit"),
    email: z.email(),
    mobile: z
      .string()
      .nonempty(
        "Please enter a mobile phone number to help us contact you in case of an emergency"
      ),
    avatar: z.file(),
    photoUrl: z.any().optional(),
  })
  .refine(
    (data) => {
      return data.photoUrl || data.avatar.size !== 0;
    },
    {
      message:
        "Please upload an image this will help our coaches identify you when you attend",
      path: ["avatar"], // show error under avatar
    }
  );
