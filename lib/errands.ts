import type { Ask } from "@/components/Guide";

/**
 * Errands: the things we do that have no price on them until we ask.
 *
 * Everything else in the shop is a catalogue. A project is two hundred
 * pages or four hundred, in three copies or six, spiral or hard bound, and
 * a laundry bag is whatever is in it. None of that can carry a price before
 * somebody says what it is, and a page that pretends otherwise either lies
 * or asks eight questions before it has said what it does.
 *
 * So these pages explain the job, say exactly what we need to know to price
 * it, and then get out of the way: WhatsApp first, because that is how this
 * shop already talks to everybody and because a project arrives as a file;
 * the form underneath for whoever would rather type into boxes. Both land in
 * the same place, which is the requests list in admin.
 */
export type Errand = {
  /** The address, under the campus prefix the other guides use. */
  slug: string;
  /** What it is called in a link and at the top of the page. */
  title: string;
  ticket: string;
  lead: string;
  /** The two or three facts worth reading before anything else, as pills
   *  under the heading. Somebody who reads nothing else on the page should
   *  still know what this is and what it costs them to ask. */
  pills: string[];
  /** The first line of the message they send themselves. */
  opening: string;
  /** What the form's big box asks, and what it starts with. */
  label: string;
  preset: string;
  chips: string[];
  /** What we have to know before anybody can be given a price. */
  needs: { what: string; why: string }[];
  /** The job, in the order it happens. */
  steps: [string, string][];
  /** The thing the shop has to say plainly before money is taken. */
  careful: { title: string; said: string };
  /** The questions, as the page ships them. Admin can edit every one. */
  asked: Ask[];
  /** Whether the page prints the laundry price list under it. Only one
   *  errand has a per item price; the rest are quoted. */
  priceList?: boolean;
  /** What the attachment on this page is for. A printing page wants the
   *  document; most of the others want a photograph. */
  attach?: { label: string; accept: string; hint: string };
  /** Whether the page carries the printing catalogue: two hundred things
   *  that can be made, every one of them quoted rather than priced. */
  catalogue?: boolean;
};

export const ERRANDS: Errand[] = [
  {
    slug: "pau-project-printing",
    catalogue: true,
    attach: {
      label: "The file you want printed",
      accept: "image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt",
      hint: "A PDF is best, so nothing moves about between your laptop and the printer. Up to 15MB here; anything bigger, send it on WhatsApp.",
    },
    title: "Project, thesis and assignment printing",
    ticket: "Printing and binding · Pan-Atlantic University",
    lead: "Send us the file. Assignments and handouts printed, final year projects and theses bound, all brought to your block.",
    pills: [
      "Assignments from a few pages",
      "Projects and theses bound",
      "Brought to your block",
    ],
    opening: "Hi Sudu, I need something printed.",
    label: "Tell us what you need printed",
    preset: "Printing: ",
    chips: [
      "An assignment: ",
      "A project or thesis: ",
      "Slides or a presentation: ",
      "Spiral bound: ",
      "Hard cover: ",
      "Colour pages inside: ",
      "I need it this week: ",
    ],
    needs: [
      {
        what: "What it is",
        why: "An assignment, a seminar handout, a set of slides, a final year project. The small ones are usually same week; a binding is its own job.",
      },
      {
        what: "How many copies",
        why: "One for an assignment, three or four for a project, and your supervisor may want one of their own.",
      },
      {
        what: "How many pages",
        why: "The single biggest part of the price. Read it off the last page of your document.",
      },
      {
        what: "Bound, or just printed",
        why: "An assignment is usually just printed and stapled. Spiral suits a draft or a seminar copy, and hard cover is what most departments take at final submission.",
      },
      {
        what: "Black and white, or colour",
        why: "Colour costs more per page, so tell us if only certain pages need it. Charts and maps usually do.",
      },
      {
        what: "When you need it",
        why: "A binding takes time to set. Tell us the deadline rather than the day you would like it.",
      },
    ],
    steps: [
      [
        "Send the file",
        "As a PDF on WhatsApp, or through the form on this page. A PDF so nothing moves about between your laptop and the printer. Tell us what is on this page with it.",
      ],
      [
        "We come back with a price",
        "The whole thing, printing and binding and delivery, in one number. Nothing is printed until you say yes.",
      ],
      [
        "We print, bind and bring it",
        "To your block, on a day we agree. Several copies come as several copies, so you can hand your supervisor theirs.",
      ],
    ],
    careful: {
      title: "We print exactly what you send",
      said:
        "We do not read your project, correct it, or reformat it. A typo in the file is a typo in four bound copies, and nothing can be done with those afterwards. Read it through, and check your department's own rules on the cover, the lettering and the colour before we bind anything: those vary by school and your supervisor is the one who knows them.",
    },
    asked: [
      {
        q: "Where can I print an assignment at PAU?",
        a: "Send it to us and we print it and bring it to your block. There is no minimum: a three page assignment is as welcome as a two hundred page project, and it costs what three pages costs. Send the file as a PDF so nothing moves about between your laptop and the printer.",
      },
      {
        q: "Can you print and bind a thesis or dissertation?",
        a: "Yes. A thesis, a dissertation, a final year project: same job and the same five things decide the price, which are on this page. Hard cover is what most departments take at final submission and spiral is what most supervisors want to write on, so tell us which you need and ask for both if your draft and your final copy are different jobs.",
      },
      {
        q: "Can you print slides or a presentation?",
        a: "Yes, handouts, slides, past questions, lecture notes, anything you can send as a file. Say whether you want them in colour, because slides usually need it and it changes the price per page.",
      },
      {
        q: "How much does it cost to print and bind a project at PAU?",
        a: "It depends on the page count, the number of copies and the binding, so we price it rather than guess. Send us the file and the five things on this page and we come back with one number that covers printing, binding and bringing it to your block.",
      },
      {
        q: "How long does it take?",
        a: "Tell us your deadline rather than when you would like it. Binding in particular takes time to set, so the earlier we know, the more ways there are to get it to you in time. If it is tight, say so in the first message and we will tell you honestly whether it can be done.",
      },
      {
        q: "Can a few of us print together?",
        a: "Yes, and it is the cheapest way to do it. A whole department submits in the same fortnight, so if you order together it is one trip to the printer and one delivery between you rather than six of each. Put it in your class group and send us one message with all the files.",
      },
      {
        q: "Can you do spiral binding for a draft?",
        a: "Yes. Spiral is the usual thing for a draft, a seminar copy or anything your supervisor is going to write on. Hard cover is what most departments take at final submission. Tell us which you need, and ask us for both if your draft and your final copy are different jobs.",
      },
      {
        q: "Do you correct or format my work?",
        a: "No. We print exactly the file you send, and we do not read it. Formatting rules differ by department and your supervisor is the one who knows them, so check the cover, the lettering and the colour with them before we bind.",
      },
    ],
  },
  {
    slug: "pau-tailoring",
    title: "Tailoring: made to measure, and altered",
    ticket: "Hostel · Pan-Atlantic University",
    lead: "Something made for you from scratch, or something you own made to fit. We find the tailor, agree the price, and handle the back and forth.",
    pills: [
      "Made to measure, or altered",
      "Collected and returned",
      "Price agreed before anything is cut",
    ],
    opening: "Hi Sudu, I need a tailor.",
    label: "Tell us what you want made, or what needs doing",
    preset: "Tailoring: ",
    /* The common ones as taps, because a chip cloud of twenty-seven
       wraps into half a screen and pushes the actual form off it. The
       whole list lives in the questions below, where it can be read. */
    chips: [
      "A full outfit made: ",
      "Native wear made: ",
      "A suit made to measure: ",
      "Aso ebi for an event: ",
      "Dress alterations: ",
      "Shirt alterations: ",
      "Trouser alterations: ",
      "Suit alterations: ",
      "Jacket alterations: ",
      "Coat alterations: ",
      "Skirt alterations: ",
      "Blouse alterations: ",
      "Agbada or kaftan: ",
      "Zip replacement: ",
      "General repairs: ",
      "I need it by: ",
    ],
    needs: [
      {
        what: "Made, or mended",
        why: "A garment made from scratch and one taken in are different jobs on different clocks. Say which and the rest follows.",
      },
      {
        what: "What it is",
        why: "An agbada, a two piece suit, a gown for a wedding, a pair of trousers that no longer fit. Lace and leather are not for every tailor, so the name of the thing decides who does it.",
      },
      {
        what: "Fabric, if it is being made",
        why: "Whether you have it already or want it bought. We can go and get it, which is one errand instead of two, and you see it before it is cut.",
      },
      {
        what: "Measurements, or a fitting",
        why: "Your numbers if you have them, and if not the tailor takes them. For something made there is usually a fitting in the middle as well, so say if getting to one is hard.",
      },
      {
        what: "When you need it",
        why: "An event date is a real deadline, and tailors are busiest before the same ones everybody else has. The date decides whether this is possible at all, so lead with it.",
      },
    ],
    steps: [
      [
        "Tell us the job and the date",
        "What you want made, or what needs altering, and when you need to be wearing it.",
      ],
      [
        "We match you with a tailor and price it",
        "From people we have used before. For something made we sort the fabric and the measurements at this point, and you see the price before anything is cut.",
      ],
      [
        "Fittings where it needs them, then your block",
        "Something made usually has a fitting partway through, and we arrange it. Try it on while we are standing there at the end, so anything still wrong goes straight back with us.",
      ],
    ],
    careful: {
      title: "The tailor sews it, we arrange it",
      said:
        "We find the tailor, agree the price, buy the fabric where you ask us to, and carry everything both ways. The sewing is theirs and so is the fit. We will not take anything irreplaceable, and anything you would be heartbroken to lose is better carried by hand. Try it on while we are standing there, at a fitting and at the end: a garment that is not right is a quick fix that day and a long argument a week later. If a tailor we sent you does bad work, tell us the same day, because we stop using people who keep getting it wrong and that only works if we hear about it.",
    },
    asked: [
      {
        q: "Is there a tailor at PAU?",
        a: "Not on campus, which is why we do this. Tell us what needs doing and we collect the garment from your block, take it to a tailor we have used before, and bring it back when it is done.",
      },
      {
        q: "What alterations do you do?",
        a: "Everyday things: dress, shirt, blouse, trouser, skirt and jumpsuit alterations, taken in, let out or hemmed, and trouser shortening. Tailoring proper: suit, dinner suit, tuxedo, morning suit, wedding suit and waistcoat alterations, and coat or jacket relining. Occasion wear: ball gowns, evening dresses, prom dresses. Native: agbada and kaftan alterations. The harder materials: leather, suede, shearling and fur coat alterations and repairs. And the small jobs that are most of the work, which are zip replacement, general repairs, and jean shortening with the original finish kept so it does not look cut. If what you need is not on that list, ask anyway: it is what we are asked for most, not everything a tailor can do.",
      },
      {
        q: "How much does an alteration cost?",
        a: "It depends on the garment and the job, so we agree the price with the tailor and tell you before anything is cut. Nothing is started until you say yes.",
      },
      {
        q: "Can you get a tailor to make a full outfit?",
        a: "Yes, and it is half of what this is for. Native wear, a suit, a gown, aso ebi for a wedding: tell us what you want and when you need to be wearing it, and we find a tailor who does that kind of work and agree the price before anything is cut. We can buy the fabric on the way if you do not have it, so it is one errand rather than two.",
      },
      {
        q: "How long does it take to have something made?",
        a: "Longer than you think and it depends entirely on the tailor's queue, which is worst before the events everybody else is also dressing for. Lead with your date rather than your design: it decides whether the thing is possible at all, and we would rather tell you no at the start than late.",
      },
      {
        q: "Do I need to be measured?",
        a: "The tailor takes your measurements if you do not have them, and for something made there is usually a fitting partway through as well. Say if getting to a fitting is hard and we work round it, but a garment made without one is a garment nobody can promise will fit.",
      },
      {
        q: "Can you buy the fabric too?",
        a: "Yes. Tell us roughly what you want and what you would spend, and we send you pictures and a price before anything is bought. Nothing is cut until you have seen it and said yes.",
      },
      {
        q: "What if it comes back wrong?",
        a: "Try it on while we are still at your block. If it is not right it goes straight back with us and the tailor fixes it. That is far easier on the day than a week later.",
      },
    ],
  },
  {
    slug: "pau-hair-and-barbing",
    title: "Hair, braids and barbing",
    ticket: "Hostel · Pan-Atlantic University",
    lead: "Tell us what you want done and when. We find somebody good and arrange it.",
    pills: ["On campus, or we arrange the trip", "Priced before anything is booked"],
    opening: "Hi Sudu, I would like to book hair or barbing.",
    label: "Tell us what you want done",
    preset: "Hair: ",
    chips: [
      "Braids: ",
      "Barbing: ",
      "Wig install: ",
      "Retouch: ",
      "Nails: ",
      "I need it before: ",
    ],
    needs: [
      {
        what: "What you want done",
        why: "Braids, a cut, a wig install, nails. The style if you know it, a picture if you have one.",
      },
      {
        what: "Your hair, roughly",
        why: "Length and whether it is natural or relaxed change how long it takes and what it costs.",
      },
      {
        what: "Whether you have the hair or extensions",
        why: "If not we can buy them on the way, which is one errand rather than two.",
      },
      {
        what: "When, and how long you have",
        why: "Braiding takes hours. Knowing the day and the window is most of making it happen at all.",
      },
    ],
    steps: [
      ["Tell us the style and the day", "With a picture if you have one, because a picture settles in one message what words take five."],
      ["We find somebody and price it", "From people we have used before. You get the price and the time before anything is booked."],
      ["It happens where you agreed", "On campus where that is allowed, or we arrange getting you there and back."],
    ],
    careful: {
      title: "We arrange it, we do not do it",
      said:
        "We are not a salon. We find somebody we have used before, agree the price and the time, and sort out the getting there. The work is theirs and so is the result. If somebody we sent you does a bad job we want to hear it the same day, because we stop using people who keep getting it wrong, and that only works if you tell us.",
    },
    asked: [
      {
        q: "Can I get my hair braided at PAU?",
        a: "Yes. Tell us the style, roughly what your hair is like and when you need it done, and we find somebody we have used before and arrange it. Send a picture of the style if you have one: it settles in one message what words take five.",
      },
      {
        q: "How much does it cost?",
        a: "It depends on the style, your hair and how long it takes, so we price it with the stylist and tell you before anything is booked. If you need hair or extensions bought, we can do that on the way and it goes in the same price.",
      },
      {
        q: "Do they come to campus, or do I go to them?",
        a: "Whichever works. On campus where that is allowed, and otherwise we arrange getting you there and back. Say which you would prefer in the first message.",
      },
      {
        q: "Can you do barbing too?",
        a: "Yes. Same thing: tell us when you need it and we arrange somebody.",
      },
    ],
  },
  {
    slug: "pau-phone-and-laptop-repair",
    title: "Phone and laptop repair",
    ticket: "Hostel · Pan-Atlantic University",
    lead: "A cracked screen, a port that will not charge, a battery that lasts an hour. We take it, they fix it, we bring it back.",
    pills: ["Collected from your block", "Quoted before any work starts"],
    opening: "Hi Sudu, I have a phone or laptop that needs fixing.",
    label: "Tell us what is wrong",
    preset: "Repair: ",
    chips: [
      "Cracked screen: ",
      "Will not charge: ",
      "Battery: ",
      "Keyboard: ",
      "It will not come on: ",
      "I need it back by: ",
    ],
    needs: [
      {
        what: "What it is",
        why: "The make and model. A part for one phone is not a part for another, and knowing it saves a day.",
      },
      {
        what: "What it does, and when it started",
        why: "Say it plainly: it will not charge, it is slow, the screen is cracked. When it started often says why.",
      },
      {
        what: "Whether it still comes on",
        why: "A device that still works can be backed up first. One that will not is a different conversation.",
      },
      {
        what: "How long you can be without it",
        why: "A screen is often the same day. A board fault is not, and it is better to know that before we take it.",
      },
    ],
    steps: [
      ["Tell us what is wrong", "And back up anything you cannot lose before you hand it over. Do that part first."],
      ["We collect it and get it looked at", "They diagnose it and quote. You get the number before any work starts, and you can say no."],
      ["It comes back to your block", "Switch it on and check it while we are there, rather than after we have gone."],
    ],
    careful: {
      title: "Back it up first, and the repair is theirs",
      said:
        "Back up your photos and your files before you hand anything over. A repair can mean a wipe, data is not something anybody can put back, and we cannot be responsible for what was on it. We carry the device and agree the price; the repair is the repairer's work and their guarantee. A device already opened by somebody else, or wet, may not be fixable at all, and we would rather say so at the start than after you have waited a week.",
    },
    asked: [
      {
        q: "Where can I fix my phone at PAU?",
        a: "There is nowhere on campus, which is why we do this. Tell us the make, the model and what it does, and we collect it from your block, get it looked at, and bring you the price before any work starts.",
      },
      {
        q: "How long will it take?",
        a: "A screen is often same day or next. Anything on the board is longer and sometimes not worth doing at all, and we would rather tell you that at the start than after a week. Say how long you can be without it and we will be straight with you.",
      },
      {
        q: "Will I lose what is on it?",
        a: "Possibly. A repair can mean a wipe, and nobody can put data back afterwards. Back up your photos and files before you hand it over, and treat that as the first step rather than something to do later.",
      },
      {
        q: "What if it cannot be fixed?",
        a: "You pay nothing for the repair and we bring it back to you. Diagnosis costs what the repairer charges to look, which we tell you up front.",
      },
    ],
  },
  {
    slug: "pau-buy-a-laptop",
    title: "Buying a laptop or a phone",
    ticket: "Hostel · Pan-Atlantic University",
    lead: "Tell us what you need it for and what you can spend. We find it, check it, and bring it to your block.",
    pills: ["Photos and a price before you pay", "You check it at your door"],
    opening: "Hi Sudu, I want to buy a laptop or a phone.",
    label: "Tell us what you are looking for",
    preset: "Looking to buy: ",
    chips: [
      "A laptop for school: ",
      "Something for design or video: ",
      "A phone: ",
      "UK or US used: ",
      "Brand new: ",
      "My budget is: ",
    ],
    needs: [
      {
        what: "What you will use it for",
        why: "Notes and lectures, or editing video. The honest answer saves you money far more often than it costs you any.",
      },
      {
        what: "What you can spend",
        why: "A real number, not a hopeful one. It is the single thing that decides what is worth looking at.",
      },
      {
        what: "New, or clean used",
        why: "Used goes much further at the same money. Say if it has to be new and we will tell you what that buys.",
      },
      {
        what: "Anything it must have",
        why: "A particular processor, storage, a backlit keyboard, a specific phone. Say so, because it narrows everything.",
      },
      {
        what: "When you need it",
        why: "A good one at the right price sometimes takes a few days to find. A deadline tells us whether to wait or to take what is there.",
      },
    ],
    steps: [
      [
        "Tell us what you need",
        "What it is for and what you can spend. We come back with what that money actually buys, honestly, including whether it is worth waiting.",
      ],
      [
        "We go and find it",
        "We look, we check it over, and we send you photographs and the price before you pay anything. If it is not right we keep looking rather than talk you into it.",
      ],
      [
        "We bring it to your block",
        "Turn it on and go through it while we are standing there. Anything wrong at that moment and it goes straight back with us.",
      ],
    ],
    careful: {
      title: "Check it in front of us, and nothing is bought until you say yes",
      said:
        "We are a delivery and errand service, not a dealer. We find it, we look it over, and we send you pictures and a price before a naira moves. The thing to do when we hand it over is turn it on there and then: check the screen, the keyboard, the ports, the battery and the storage, with us still standing there, because that is the one moment it can go straight back. Used electronics in Lagos carry whatever warranty the seller gives and often none, and we will tell you plainly which it is rather than invent one. We do not buy anything we think is stolen, and we will not pretend a used machine is new.",
    },
    asked: [
      {
        q: "Where can I buy a laptop as a student at PAU?",
        a: "Tell us what you need it for and what you can spend, and we go and find it for you. We send photographs and a price before anything is bought, and we bring it to your block so you can check it over in front of us. There is nothing to browse here: it is an errand, not a shop.",
      },
      {
        q: "How much should a student laptop cost?",
        a: "Give us your budget and what you will use it for and we will tell you honestly what that money buys right now, because prices move. If your budget does not reach what you actually need, we would rather say so than sell you something that will not do the job.",
      },
      {
        q: "New or used?",
        a: "Used goes a great deal further at the same money, and most student machines in Lagos are clean used imports. Say if it has to be new and we will tell you what that buys instead. Either way we tell you exactly which one you are getting.",
      },
      {
        q: "What if it develops a fault?",
        a: "Used electronics carry whatever the seller gives, which is sometimes a short warranty and often nothing, and we tell you which before you pay rather than after. That is why we hand it over and wait while you check it. If something is wrong at that moment it goes straight back with us.",
      },
      {
        q: "Can you get a phone too?",
        a: "Yes, the same way. Tell us the model or just what you want it to do, and your budget.",
      },
    ],
  },
  {
    slug: "pau-laundry",
    priceList: true,
    title: "Laundry, collected from your block",
    ticket: "Hostel · Pan-Atlantic University",
    lead: "We collect from your block on {days}, get it washed, and bring it back folded within 48 hours.",
    pills: ["{days}", "Back within 48 hours", "Collection included"],
    opening: "Hi Sudu, I would like my laundry collected.",
    label: "Tell us about the load",
    preset: "Laundry: ",
    chips: [
      "Wash and fold: ",
      "Wash and iron: ",
      "Just ironing: ",
      "A few shirts: ",
      "A full bag: ",
    ],
    needs: [
      {
        what: "What is in it",
        why: "Everything is priced per item on the list below, so a rough count of each kind is all it takes: four shirts, two trousers, a duvet.",
      },
      {
        what: "Washed, or washed and ironed",
        why: "Ironing is the part that takes the time, so it is the part that changes the price.",
      },
      {
        what: "Anything that needs care",
        why: "A white shirt, something that runs, anything you would not put in with the rest. Tell us and it is kept apart.",
      },
      {
        what: "Which collection you want",
        why: "{days}. Say which one and we have your block on the list for it.",
      },
    ],
    steps: [
      [
        "Tell us the night before",
        "Message us or fill the form, with roughly what is in the bag. We collect on {days}, so say which one and we put your block on the list.",
      ],
      [
        "We collect from your block",
        "Same as a delivery, in reverse. Bag it up and hand it over. We count it through with you there, so both of us know what went.",
      ],
      [
        "It comes back folded, within 48 hours",
        "To your block, counted again in front of you. You pay when you have it back and not before.",
      ],
    ],
    careful: {
      title: "Check your pockets, and tell us what is delicate",
      said:
        "Everything is counted in front of you when we collect and counted again when we bring it back, and we will tell you straight away if anything is missing or has come back wrong. What we cannot do is undo a colour that ran or a garment that was never going to survive a wash, so anything delicate, anything new and anything white is worth naming when you hand it over. Empty your pockets: we do not open them.",
    },
    asked: [
      {
        q: "Do you do laundry for students at PAU?",
        a: "Yes. We collect from your block on {days}, get it washed, and bring it back folded within 48 hours. Everything is priced per item and the whole list is on this page, so you can work out what a bag costs before you message anybody.",
      },
      {
        q: "How much is it?",
        a: "Per item, and the full list is on this page. A shirt, a pair of trousers, a duvet and a blazer all cost different things, which is how the trade works here. Collection and the trip back are included, and there is a minimum on a collection because it is two journeys: gather a few things, or go in with somebody in your hostel.",
      },
      {
        q: "How long does it take?",
        a: "Within 48 hours of collection, back at your block. We collect on {days}, so a bag handed over on a collection day is back two days later. We would rather say two days and be early than say one and be late.",
      },
      {
        q: "How does collection and return work?",
        a: "There is nothing to drop off anywhere. Tell us the night before, on WhatsApp or through the form on this page, and say which collection you want: we come on {days}. We meet you at your block, count the bag through with you standing there, and bring it back folded within 48 hours, counted again in front of you. You pay when you have it back.",
      },
      {
        q: "Can I get it back the same day?",
        a: "Not as a promise. Our deliveries run in the late afternoon and the cleaning itself takes the day, so same day would mean telling you a time we cannot reliably keep. If something is genuinely urgent, message us and we will tell you honestly whether it can be done that week rather than guessing.",
      },
      {
        q: "What if something gets damaged or goes missing?",
        a: "It is counted in front of you when we collect and again when we return it, so anything missing is noticed that day rather than a week later. If we lose it or we damage it, that is ours and we put it right. What we cannot undo is a colour that ran or a fabric that was never going to survive a wash, so name anything delicate, new or white when you hand it over and it is kept apart.",
      },
      {
        q: "Can I just get ironing done?",
        a: "Yes. Say so when you message and we price it as ironing rather than as a wash.",
      },
    ],
  },
];

/**
 * The days written into the copy, filled in from settings.
 *
 * They were spelt out in seven sentences, so moving a collection day
 * meant a deploy and finding all seven. The copy says {days} and the page
 * fills it, which also means the shop can add a Tuesday and have every
 * sentence on the page agree with the buttons underneath it.
 */
export function withDays(spec: Errand, said: string): Errand {
  const swap = (text: string) => text.split("{days}").join(said);
  return {
    ...spec,
    lead: swap(spec.lead),
    pills: spec.pills.map(swap),
    needs: spec.needs.map((one) => ({ what: swap(one.what), why: swap(one.why) })),
    steps: spec.steps.map(([title, body]) => [swap(title), swap(body)] as [string, string]),
    careful: { title: swap(spec.careful.title), said: swap(spec.careful.said) },
    asked: spec.asked.map((one) => ({ q: swap(one.q), a: swap(one.a) })),
  };
}

export function errandBySlug(slug: string): Errand | null {
  return ERRANDS.find((one) => one.slug === slug) ?? null;
}

/**
 * The words that mean one of these, for the chat.
 *
 * It searched the food menu, found nothing, and offered to go and source
 * a thing we run a whole page about. Laundry is not a dish and never will
 * be, so the menu was never going to answer it.
 *
 * Deliberately specific: a word here sends somebody to a page, so "cut"
 * must not mean barbing and "suit" must not mean a suit somebody wants
 * bought. Where a word is genuinely ambiguous it is left out and the
 * ordinary search keeps it.
 */
const MEANS: { slug: string; words: RegExp }[] = [
  {
    slug: "pau-project-printing",
    words:
      /\b(print(ing|out|s)?|printer|photocopy|photo ?copy|bind(ing)?|bound|thesis|theses|dissertation|project work|final year project|assignment|coursework|seminar paper|handout|lamination|laminate|spiral|hard ?cover|banner|flyer|sticker|poster)\b/i,
  },
  {
    slug: "pau-laundry",
    words: /\b(laundry|launder|wash(ing|ed)?|dry ?clean(ing|er)?|iron(ing)?|press(ing)? my|fold(ed|ing)?)\b/i,
  },
  {
    slug: "pau-tailoring",
    words:
      /\b(tailor|tailoring|seamstress|alter(ation|ations|ing)?|amend(ing)?|mend(ing)?|hem(ming)?|take in|let out|relining|resize|re ?size|zip (change|replacement)|sew(ing)?|stitch(ing)?|agbada|abgada|kaftan|aso ?ebi|native wear|too (big|tight|long|short) for me|does ?n[o']?t fit|fits? me|my clothes|my dress|my trouser|my gown|my suit)\b/i,
  },
  {
    slug: "pau-hair-and-barbing",
    words: /\b(barb(er|ing)|braid(s|ing)?|hairdresser|salon|wig|retouch|manicure|pedicure|nails)\b/i,
  },
  {
    slug: "pau-phone-and-laptop-repair",
    words:
      /\b(repair|fix my|cracked screen|broken screen|screen replacement|charging port|battery|will ?not charge|wont charge|laptop repair|phone repair)\b/i,
  },
  {
    slug: "pau-buy-a-laptop",
    words: /\b(buy a (laptop|phone)|looking for a laptop|need a laptop|new laptop|get me a laptop|laptop to buy)\b/i,
  },
];

/**
 * A sentence about the order somebody is already placing, which is never
 * an errand however it is worded.
 *
 * "Amend my clothes" is a tailor and "amend my order" is the basket on
 * the screen, and the two are one word apart. Sending somebody mid-order
 * to a page about hemming trousers is far worse than missing a tailoring
 * lead, so anything naming the order, the cart or the basket is left to
 * the chat.
 */
const ABOUT_THE_ORDER = /\b(my|the|this) (order|cart|basket|delivery|run)\b/i;

/** The errand a sentence is about, where it plainly is about one. */
export function errandMeant(said: string): Errand | null {
  if (ABOUT_THE_ORDER.test(said)) return null;
  for (const one of MEANS) {
    if (one.words.test(said)) return errandBySlug(one.slug);
  }
  return null;
}
