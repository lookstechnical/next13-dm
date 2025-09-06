import { Textarea } from "~/components/ui/textarea";
import { Field } from "../field";
import ImageRating, { RatingItem } from "../image-rating";

export const reflectionQuestions = [
  "What do you feel went well?",
  "What do you feel could have been better?",
  "How would you rate the player engagement?",
  "How would you rate your energy and delivery as the coach?",
];

export const energy: RatingItem[] = [
  {
    image: "https://cdn-icons-png.flaticon.com/512/1828/1828665.png", // sleepy face
    description: "Low Energy / Monotone",
  },
  {
    image: "https://cdn-icons-png.flaticon.com/512/742/742751.png", // neutral face
    description: "Moderate Energy / Some Engagement",
  },
  {
    image: "https://cdn-icons-png.flaticon.com/512/742/742760.png", // smile face
    description: "Good Energy / Clear Delivery",
  },
  {
    image: "https://cdn-icons-png.flaticon.com/512/742/742758.png", // excited face
    description: "High Energy / Engaging Delivery",
  },
  {
    image: "https://cdn-icons-png.flaticon.com/512/742/742767.png", // super happy / dynamic
    description: "Very High Energy / Inspiring",
  },
];

export const ReflectForm = () => {
  return (
    <div className="flex flex-col gap-8">
      <Field name="well" label={reflectionQuestions[0]}>
        <Textarea name="well" placeholder="" />
      </Field>
      <Field name="improve" label={reflectionQuestions[1]}>
        <Textarea name="improve" placeholder="" />
      </Field>
      <div className="flex flex-col lg:flex-row gap-8">
        <Field name="engage" label={reflectionQuestions[2]}>
          <ImageRating name="engage" />
        </Field>
        <Field name="coachEnergy" label={reflectionQuestions[3]}>
          <ImageRating name="coachEnergy" items={energy} />
        </Field>
      </div>
    </div>
  );
};
