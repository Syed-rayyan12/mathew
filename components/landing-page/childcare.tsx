import { ShieldCheck, GraduationCap, Puzzle, Timer, Smile, Heart } from "lucide-react";

export default function Childcare() {
  const cards = [
    {
      title: "Safe Environment",
      desc: "We ensure a clean, friendly, and secure space for every child to learn and grow.",
      icon: <ShieldCheck className="text-secondary" size={24} />,
    },
    {
      title: "Expert Staff",
      desc: "Your child is guided by trained professionals who understand early development.",
      icon: <GraduationCap className="text-secondary" size={24} />,
    },
    {
      title: "Play-Based Learning",
      desc: "Children learn naturally through fun, interactive, and engaging activities.",
      icon: <Puzzle className="text-secondary" size={24} />,
    },
    {
      title: "Healthy Routine",
      desc: "Balanced routines help children feel comfortable and confident every day.",
      icon: <Timer className="text-secondary" size={24} />,
    },
    {
      title: "Parent Updates",
      desc: "Stay connected with regular updates, photos, and activity highlights.",
      icon: <Smile className="text-secondary" size={24} />,
    },
    {
      title: "Emotional Support",
      desc: "We focus on emotional development, kindness, and building social skills.",
      icon: <Heart className="text-secondary" size={24} />,
    },
  ];

  const items = [
    {
      num: "1",
      title: "Check Your Eligibility",
      desc: "Visit GOV.UK or Childcare Choices to see which funding options you qualify for based on your income, working hours, and family situation.",
    },
    {
      num: "2",
      title: "Apply Online",
      desc: "Complete your application through the official government website. You'll need your National Insurance number, employment details, and child's information.",
    },
    {
      num: "3",
      title: "Receive Your Code",
      desc: "Once approved, you'll receive an 11-digit eligibility code (for 30 hours) or confirmation letter (for other schemes).",
    },
    {
      num: "4",
      title: "Share With Your Nursery",
      desc: "Give your code or confirmation to your chosen nursery. They will verify your eligibility and apply the funding.",
    },
    {
      num: "5",
      title: "Funding Applied Automatically",
      desc: "Your nursery will deduct the funded hours from your invoice. You only pay for any additional hours or services.",
    },
  ];

  return (
    <div className=" mx-auto text-center py-14 px-24 max-sm:px-4 bg-white">
      {/* Heading */}
      <h2 className="text-[48px] font-medium font-heading">Available Funding Options</h2>

      {/* Paragraph 2 lines */}
      <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
        Explore all the ways you can reduce your childcare costs through government support and funding schemes.
      </p>

      {/* Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6 mt-12">
        {cards.map((card, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-md p-6 text-left bg-white"
          >
            {/* Icon + Heading */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#D8F6FD] text-2xl">
                {card.icon}
              </div>
              <h3 className="text-lg font-medium font-heading">{card.title}</h3>
            </div>

            {/* Paragraph */}
            <p className="mt-3 text-gray-600 text-sm">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="px-10 mt-20 max-sm:px-4">
        <h2 className="text-[48px] font-medium font-heading">How to Apply for Funding</h2>
        <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
          Explore all the ways you can reduce your childcare costs through government support and funding schemes.
        </p>
        <div className="p-8 mt-5 bg-white rounded-lg shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] shadow-2xl space-y-12 ">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex max-sm:flex-col max-sm:items-start items-center gap-4"
            >
              {/* Number Icon */}
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-white font-medium text-lg">
                {item.num}
              </div>

              {/* Heading + Paragraph */}
              <div className="">
                <h3 className="text-xl font-medium text-[#044A55]  text-start">{item.title}</h3>
                <p className="text-gray-600 mt-1 text-start">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
