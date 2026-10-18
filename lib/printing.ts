/**
 * The printing catalogue: what can be made, with no price on any of it.
 *
 * Every one of these is quoted. A hundred flyers and a thousand are not
 * the same number and neither is a banner in one size or another, so a
 * price printed here would be a price somebody has to be talked out of.
 * What the list is for is breadth: nobody guesses that the shop doing
 * their assignment also does roll-up banners and ID cards unless it says
 * so.
 *
 * Names and descriptions only. The supplier's own prices, links and
 * photographs are deliberately not here: the prices are theirs, and the
 * photographs are theirs until we have taken our own.
 */
export type PrintItem = { slug: string; name: string; said: string };
export type PrintGroup = { name: string; items: PrintItem[] };

export const PRINTING: PrintGroup[] = [
  /*
   * Ours, not the supplier's, and first.
   *
   * Their catalogue is a trade list: Thermal Binding, Velo Bind,
   * Saddle-Stitched, Print out Colored. Every one of those is a real
   * thing and not one of them is a word a student would ever type. The
   * job somebody at PAU actually has is "my project needs binding" or "I
   * have an assignment to print", so that is what the shelf opens on.
   */
  {
    name: "Projects and coursework",
    items: [
      { slug: "final-year-project-hard-cover", name: "Final year project, hard cover bound", said: "The one most departments take at final submission. Printed, bound and brought to your block, with as many copies as your department and your supervisor need." },
      { slug: "final-year-project-spiral", name: "Final year project, spiral bound", said: "For a draft, a seminar copy or anything your supervisor is going to write on." },
      { slug: "thesis-hard-cover", name: "Thesis or dissertation, hard cover", said: "Same job as a project binding, by the name your programme uses for it. Check your department's rules on the cover and the lettering before we bind." },
      { slug: "thesis-spiral", name: "Thesis or dissertation, spiral bound", said: "For corrections, a supervisor's copy, or anything that is not the final submission." },
      { slug: "project-chapter-draft", name: "A chapter or a draft", said: "Printed and stapled or spiral bound, for marking up. Cheaper than binding the whole thing twice." },
      { slug: "assignment-printing", name: "Assignment printing", said: "No minimum. Three pages is as welcome as three hundred and costs what three pages costs." },
      { slug: "seminar-handout", name: "Seminar papers and handouts", said: "However many copies the room needs, stapled or loose." },
      { slug: "presentation-slides", name: "Presentation slides", said: "Printed as handouts, several to a page if you want them that way. Say if they need colour, because slides usually do." },
      { slug: "lecture-notes-past-questions", name: "Lecture notes and past questions", said: "Send the file and say how many copies. Going in with your class makes it cheaper for everybody." },
      { slug: "photocopying", name: "Photocopying", said: "Black and white or colour, from a document you send or one we collect." },
      { slug: "lamination", name: "Lamination", said: "ID cards, certificates, anything that has to survive a bag." },
      { slug: "passport-photographs", name: "Passport photographs", said: "The standard sizes, for forms and applications." },
      { slug: "typing-and-formatting", name: "Typing and formatting", said: "Handwritten work typed up, or a document put into the format your department asks for." },
    ],
  },
  {
    name: "Branding Material",
    items: [
      { slug: "koosht-kaleido-sublimation-mug", name: "KOOSHT KALEIDO SUBLIMATION MUG", said: "Branding Material" },
      { slug: "wilson-white-gift-set", name: "Wilson White Gift Set", said: "Branding Material" },
      { slug: "shuffle-dome-flash-frive-8gb", name: "SHUFFLE DOME FLASH FRIVE- 8GB", said: "Branding Material" },
      { slug: "odeon-slim-power-bank-4-000mah", name: "Odeon Slim Power Bank – 4,000mAh", said: "Branding Material" },
      { slug: "alex-varga-chapman-code-lock-hard-cover-notebook", name: "Alex Varga Chapman Code-Lock Hard Cover Notebook", said: "Branding Material" },
      { slug: "okiyo-denki-cork-a5-hard-cover-notebook", name: "Okiyo Denki Cork A5 Hard Cover Notebook", said: "Branding Material" },
      { slug: "okiyo-natsu-glass-bamboo-tumbler-straw-500ml", name: "Okiyo Natsu Glass & Bamboo Tumbler & Straw – 500ml", said: "Branding Material" },
      { slug: "alex-varga-ramos-stainless-steel-vacuum-tumbler-400ml", name: "Alex Varga Ramos Stainless Steel Vacuum Tumbler ? 400ml", said: "Branding Material" },
      { slug: "alex-varta-notebook-and-pen", name: "ALEX VARTA NOTEBOOK AND PEN", said: "Branding Material" },
      { slug: "oakridge-a5-soft-cover-notebook", name: "Oakridge A5 Soft Cover Notebook", said: "Branding Material" },
      { slug: "altitude-colourblock-a5-soft-cover-notebook", name: "Altitude Colourblock A5 Soft Cover Notebook", said: "Branding Material" },
      { slug: "kooshty-slurp-glass-kup-straw-480ml", name: "Kooshty Slurp Glass Kup & Straw – 480ML", said: "Branding Material" },
      { slug: "kooshty-kork-chacha-glass-kup-340ml", name: "Kooshty Kork Chacha Glass Kup – 340ML", said: "Branding Material" },
      { slug: "kooshty-original-glass-kup-340ml", name: "Kooshty Original Glass Kup ? 340ML", said: "Branding Material" },
      { slug: "eden-sublimation-ceramic-coffee-mug-spoon-set-320ml", name: "Eden Sublimation Ceramic Coffee Mug & Spoon Set – 320ml", said: "Branding Material" },
      { slug: "altitude-evolution-ball-pen", name: "Altitude Evolution Ball Pen", said: "Branding Material" },
      { slug: "swiss-cougar-chicago-bluetooth-speaker-fm-radio", name: "Swiss Cougar Chicago Bluetooth Speaker & FM Radio", said: "Branding Material" },
      { slug: "okiyo-sozo-bamboo-ceramic-sublimation-coffee-mug-330ml", name: "Okiyo Sozo Bamboo & Ceramic Sublimation Coffee Mug – 330ml", said: "Branding Material" },
      { slug: "micron-dome-flash-drive-keyholder-8gb", name: "Micron Dome Flash Drive Keyholder – 8GB", said: "Branding Material" },
      { slug: "altitude-chico-ball-pen", name: "Altitude Chico Ball Pen", said: "Branding Material" },
      { slug: "altitude-andorra-stylus-ball-pen", name: "Altitude Andorra Stylus Ball Pen", said: "Branding Material" },
      { slug: "altitude-sickle-ball-pen", name: "Altitude Sickle Ball Pen", said: "Branding Material" },
      { slug: "altitude-eco-scribe-stylus-ball-pen", name: "Altitude Eco-Scribe Stylus Ball Pen", said: "Branding Material" },
      { slug: "altitude-scythe-ball-pen", name: "Altitude Scythe Ball Pen", said: "Branding Material" },
      { slug: "altitude-blank-canvas-sublimation-ceramic-coffee-mug-330ml", name: "Altitude Blank Canvas Sublimation Ceramic Coffee Mug – 330ml", said: "Branding Material" },
      { slug: "axis-dome-flash-drive-4gb", name: "Axis Dome Flash Drive – 4GB", said: "Branding Material" },
      { slug: "altitude-encircle-dual-dome-keyholder", name: "Altitude Encircle Dual-Dome Keyholder", said: "Branding Material" },
      { slug: "altitude-squaring-up-dual-dome-keyholder", name: "Altitude Squaring-Up Dual-Dome Keyholder", said: "Branding Material" },
      { slug: "alex-varga-shackleton-stainless-steel-vacuum-water-bottle-80", name: "Alex Varga Shackleton Stainless Steel Vacuum Water Bottle – 800ml", said: "Branding Material" },
      { slug: "alex-varga-aurelian-stainless-steel-2-in-1-vacuum-tumbler-st", name: "Alex Varga Aurelian Stainless Steel 2-in-1 Vacuum Tumbler & Straw", said: "Branding Material" },
      { slug: "curve-wireless-optical-mouse", name: "Curve Wireless Optical Mouse", said: "Branding Material" },
      { slug: "transition-sublimation-ceramic-coffee-mug-325ml", name: "Transition Sublimation Ceramic Coffee Mug – 325ml", said: "Branding Material" },
      { slug: "crossover-aluminium-water-bottle-750ml", name: "Crossover Aluminium Water Bottle – 750ml", said: "Branding Material" },
      { slug: "serendipio-baxter-stainless-steel-water-bottle-1-litre", name: "Serendipio Baxter Stainless Steel Water Bottle – 1 Litre", said: "Branding Material" },
      { slug: "serendipio-marshall-ceramic-coffee-mug-400ml", name: "Serendipio Marshall Ceramic Coffee Mug – 400ml", said: "Branding Material" },
      { slug: "alex-varga-figo-stainless-steel-vacuum-tumbler-370ml", name: "Alex Varga Figo Stainless Steel Vacuum Tumbler ? 370ml", said: "Branding Material" },
      { slug: "swiss-cougar-london-bluetooth-speaker-fm-radio", name: "Swiss Cougar London Bluetooth Speaker & FM Radio", said: "Branding Material" },
      { slug: "swiss-cougar-tokyo-wireless-charger-bluetooth-speaker", name: "Swiss Cougar Tokyo Wireless Charger & Bluetooth Speaker", said: "Branding Material" },
      { slug: "swiss-cougar-geneva-wireless-charger-bluetooth-speaker", name: "Swiss Cougar Geneva Wireless Charger & Bluetooth Speaker", said: "Branding Material" },
      { slug: "andy-cartwright-afrique-flash-drive-keyholder-16gb", name: "Andy Cartwright Afrique Flash Drive Keyholder – 16GB", said: "Branding Material" },
      { slug: "alex-varga-asterin-power-bank-20-000mah", name: "Alex Varga Asterin Power Bank – 20,000mAh", said: "Branding Material" },
      { slug: "alex-varga-solovki-power-bank-10-000mah", name: "Alex Varga Solovki Power Bank – 10,000mAh", said: "Branding Material" },
      { slug: "swiss-cougar-shanghai-fast-charge-18w-power-bank-10-000mah", name: "Swiss Cougar Shanghai Fast Charge 18W Power Bank ? 10,000mAh", said: "Branding Material" },
      { slug: "swiss-cougar-havana-wireless-charging-solar-power-bank-10-00", name: "Swiss Cougar Havana Wireless Charging Solar Power Bank – 10 000mAh", said: "Branding Material" },
      { slug: "vader-wireless-charging-suction-power-bank-10-000mah", name: "Vader Wireless Charging Suction Power Bank – 10,000mAh", said: "Branding Material" },
      { slug: "altitude-palawan-bamboo-keyholder", name: "Altitude Palawan Bamboo Keyholder", said: "Branding Material" },
      { slug: "altitude-bali-bamboo-keyholder", name: "Altitude Bali Bamboo Keyholder", said: "Branding Material" },
      { slug: "kooshty-jumbo-kup-480ml-cream", name: "Kooshty Jumbo Kup – 480ML – Cream", said: "Branding Material" },
      { slug: "altitude-shake-burn-plastic-protein-shaker-400ml", name: "Altitude Shake & Burn Plastic Protein Shaker – 400ml", said: "Branding Material" },
      { slug: "altitude-klasp-retractable-badge-reel", name: "Altitude Klasp Retractable Badge Reel", said: "Branding Material" },
      { slug: "okiyo-wainoka-bamboo-wine-set", name: "Okiyo Wainoka Bamboo Wine Set", said: "Branding Material" },
      { slug: "decero-wine-box", name: "Decero Wine Box", said: "Branding Material" },
      { slug: "cavas-wine-box", name: "Cavas Wine Box", said: "Branding Material" },
      { slug: "altitude-powerhouse-plastic-protein-shaker-600ml", name: "Altitude Powerhouse Plastic Protein Shaker – 600ml", said: "Branding Material" },
      { slug: "altitude-gianna-plastic-protein-shaker-600ml", name: "Altitude Gianna Plastic Protein Shaker – 600ml", said: "Branding Material" },
      { slug: "distinction-award", name: "Distinction Award", said: "Branding Material" },
      { slug: "mistral-mini-award", name: "Mistral Mini Award", said: "Branding Material" },
      { slug: "alto-mini-award-1400-t", name: "Alto Mini Award -1400-T", said: "Branding Material" },
      { slug: "alto-mini-award-100-t", name: "Alto Mini Award -100-T", said: "Branding Material" },
      { slug: "okiyo-yahari-bamboo-notebook-pen-set", name: "Okiyo Yahari Bamboo Notebook & Pen Set", said: "Branding Material" },
      { slug: "okiyo-cardon-cork-notebook-pen-set", name: "Okiyo Cardon Cork Notebook & Pen Set", said: "Branding Material" },
      { slug: "okiyo-kenko-phone-stand-glass-water-bottle-700ml", name: "Okiyo Kenko Phone Stand Glass Water Bottle ? 700ml", said: "Branding Material" },
      { slug: "swiss-cougar-lisbon-wireless-charging-portfolio", name: "Swiss Cougar Lisbon Wireless Charging Portfolio", said: "Branding Material" },
      { slug: "altitude-hemingway-a5-hard-cover-notebook", name: "Altitude Hemingway A5 Hard Cover Notebook", said: "Branding Material" },
      { slug: "okiyo-a5-hard-cover-notebook", name: "OKIYO A5 HARD COVER NOTEBOOK", said: "Branding Material" },
    ],
  },
  {
    name: "General items",
    items: [
      { slug: "tent", name: "Tent", said: "Make your business visible to the world today with effective brand advertisement. I offer you the best and most attractive custom designs that reflect your brand and stand out from your competitors." },
      { slug: "wrapping-paper", name: "Wrapping Paper", said: "Custom your wrapping gift paper,and make sure your gift is packaged in the perfect wrap that can complement any occasion." },
      { slug: "nylon-bags", name: "Nylon Bags", said: "Personalize your nylon bags with your logo and branding." },
      { slug: "papers-bags", name: "Papers Bags", said: "Custom your bags and leave a lasting impression for your customers and guests." },
      { slug: "webcam-cover", name: "Webcam Cover", said: "High quality plastic webcam cover, print your logo on it and protect your privacy with this simple sliding webcam cover." },
      { slug: "letter-metal", name: "Letter Metal", said: "we introduce metal letters made from stainless steel letters, keyboard symbols and numbers any size and style. made by laser cutting process and great for spelling any words, signs, names or text." },
      { slug: "medal", name: "Medal", said: "Our Custom Medals are perfect for personalised gifts,sporting or academic achievements." },
      { slug: "car-freshener", name: "Car Freshener", said: "These personalized car fresheners are the perfect item for anyone! Choose a scent and select your design and use these custom air fresheners in your car or home." },
      { slug: "customized-pin", name: "Customized Pin", said: "Fancy your own design on a badge? Well, aren’t you the lucky one as we can do that for you!" },
      { slug: "metal-trophy", name: "Metal Trophy", said: "This oblivion metal trophy plaque is perfect for recognising the achievement of any corporate, sporting or school occasion." },
      { slug: "trophy-cup", name: "Trophy Cup", said: "Trophy Cup Gold Metal – Trophy cup- Award Trophy- Personalized Engraving" },
      { slug: "styro-foam-big-letters", name: "Styro-Foam Big Letters", said: "Giant letters Large free-standing letter Initials letters Wedding Letters Monogram letter Table base letters" },
      { slug: "3d-printing", name: "3D Printing", said: "Fast and reliable 3D Printing services to order. You tell is what you need, provide the link or idea and we’ll print it." },
      { slug: "double-layer-sign", name: "Double Layer Sign", said: "Good signs can get your message across from a distance. Create a double layer sign, installation service is available." },
      { slug: "customized-keychain", name: "Customized Keychain", said: "Make your own design on a keychain with embossing effect." },
      { slug: "led-sign", name: "LED Sign", said: "Make an impact by making custom, create a customized led sign." },
      { slug: "doormat", name: "Doormat", said: "Customized your doormat and impress your visitors" },
      { slug: "embroidery", name: "Embroidery", said: "Can be done on all kinds of cloth and in various colors." },
      { slug: "customized-frame", name: "Customized Frame", said: "Various frame options available to choose from: wooden or glass frames, stretching on canvas and much more. . .Ask for quantity price" },
      { slug: "visa-application", name: "Visa Application", said: "If you’re traveling to US, Canada & London, apply for your Visa at our Malik’s Hamra Branches" },
      { slug: "ads-in-newspapers", name: "Ads in newspapers", said: "Are you looking to insert an Ad in a Newspaper here in Lebanon? Do not waste your time trying to contact the right person we can do it for you in a heartbeat." },
      { slug: "rubber-stamps", name: "Rubber Stamps", said: "You can create your own personalized stamp different sizes and shapes available" },
      { slug: "folders-printing", name: "Folders printing", said: "Give your material a professional look.Use presentation folders when you are meeting potential customers, passing along important documents or creating a takeaway at an event" },
      { slug: "promotional-desk", name: "Promotional Desk", said: "Create the perfect presentation of your brand and business.Customized counters are the perfect tool for product placement, exhibitions ,show rooms and promotions" },
      { slug: "name-badge", name: "Name Badge", said: "Our name tags size are customizable, cost-effective and highly efficient. Select and design your custom name tags." },
      { slug: "plastic-id-cards", name: "Plastic ID Cards", said: "Keep your business or event secure with custom ID name badges and cards. Print onsite to customize your cards with an ID badge printer." },
      { slug: "power-banks", name: "Power Banks", said: "Create your own personalized power banks. Add text, photos or graphics. We make it easy to design for personal or business use." },
      { slug: "usb", name: "USB", said: "Print on USBs and promote your company We offer a wide range of custom USB flash drives that are ideal for office use, and all your events." },
      { slug: "pens", name: "Pens", said: "Large selection of custom pens printed with your name or logo" },
    ],
  },
  {
    name: "General Services",
    items: [
      { slug: "car-fax", name: "Car Fax", said: "You want to buy a used car, we can help you check the car status, with Carfax you will get a full report of the car status before it comes to Lebanon and then you can decide if you buy it or not." },
      { slug: "aramex", name: "Aramex", said: "You can ship any document, package or product inside & outside Lebanon to any location with Aramex." },
      { slug: "international-driving-license", name: "International Driving License", said: "We can do it in 24 hours,the below documents needed:Copy of your Lebanese driving license Copy of your passport Photo passport" },
      { slug: "translation-and-authorizations", name: "Translation and Authorizations", said: "Translate official documents like marriage certificates, embassy papers, certificates & degrees from/ to any language you want!" },
      { slug: "dhl-courier", name: "DHL Courier", said: "You can ship any document, package or product inside & outside Lebanon to any location with DHL" },
      { slug: "posters-signs", name: "Posters Signs", said: "The first impression is the last impression !Create your sign and grab the customers attention,Installation service available" },
      { slug: "signage-production", name: "Signage Production", said: "The first impression is the last impression !Create your sign and grab the customers attention,Installation service available" },
      { slug: "plexi-signs", name: "Plexi Signs", said: "Acrylic signs are the perfect signs for indoor , offices and lobbies.Customize your plexi signs and choose from different colors available.Installation service available." },
      { slug: "customized-desk-sign", name: "Customized Desk Sign", said: "Personalized Business Desk Name Wedge, ask for more shapes!" },
      { slug: "door-sign", name: "Door Sign", said: "These metal plaques are perfect for house or office signs. They can be used for any message or text that you need to have displayed." },
      { slug: "laser-engrave", name: "Laser Engrave", said: "Engrave any text or shape on wood, plexi, glass or plastic. Can be done on trophies, awards, crystals, USBs, etc. . ." },
      { slug: "laser-cut", name: "Laser Cut", said: "Cut any shape on wood, plexi, glass or plastic. Can be done on trophies, awards, crystals, USBs, etc. . ." },
      { slug: "ocr-scaning", name: "OCR Scaning", said: "OCR scanning allows you to edit the scaned files after saving them" },
      { slug: "large-scaning", name: "Large scaning", said: "Digital Archiving: Why compromise when you can have both quality and size? Save and archive your important maps for future reference." },
      { slug: "small-scaning", name: "Small scaning", said: "Digital Archiving: Scan your documents and archive them as digital files to save space in your office" },
      { slug: "typing-all-languages", name: "Typing all languages", said: "We do English/Arabic & French Typing service!" },
    ],
  },
  {
    name: "Display Items",
    items: [
      { slug: "double-side-roll-up-banner", name: "Double Side Roll Up Banner", said: "When you’re getting the word out about your business, promoting your next event or announcing a grand opening, a custom-made indoor roll up banner is the perfect way to spread your message. These banners are great for indoor events, retail promotions, parties and classrooms." },
      { slug: "x-banner", name: "X-Banner", said: "When you’re getting the word out about your business, promoting your next event or announcing a grand opening, a custom-made indoor Xbanner is the perfect way to spread your message. These banners are great for indoor events, retail promotions, parties and classrooms." },
      { slug: "twister-tower-with-led-light", name: "Twister Tower With Led Light", said: "Perfect stand to display your promotional items to attract your customers" },
      { slug: "snap-frames-with-led", name: "Snap Frames with Led", said: "Poster Board + LEDSize: A1 (59.4×89.1 cm)For indoor or outdoor" },
      { slug: "snap-frames", name: "Snap Frames", said: "Aluminum Frames and PVC cover sizes: A0,A1,A2" },
      { slug: "a-shape-poster-board", name: "A Shape Poster Board", said: "A-Shape double board size A1" },
      { slug: "outdoor-double-side-board", name: "Outdoor double side board", said: "Perfect for displaying your posters in outdoor places" },
      { slug: "pop-up-banner-curved-shape", name: "Pop Up Banner Curved Shape", said: "Pick up and choose from curved structures of different heights to create your custom set.Perfect for exhibitions, re-printable with free trolley bag Sizes available: 3x3m ; 3x4m" },
      { slug: "wall-of-fame", name: "Wall of Fame", said: "Stretched on wood frame Perfect for exhibitions, events and festivals.Custom size." },
      { slug: "outdoor-roll-up-banner", name: "Outdoor Roll Up Banner", said: "Whether you’re looking to promote a sporting event, a grand opening, or a retail promotion, outdoor banners have you covered. With a variety of options to choose from — all featuring full-color, photo-quality printing — you’re sure to find the right outdoor banner for your needs." },
      { slug: "premium-roll-up", name: "Premium Roll Up", said: "These professional and clean fashion business roll-up banners are fully layered and very easy to customize." },
    ],
  },
  {
    name: "Promo Prints",
    items: [
      { slug: "ticket-vouchers", name: "Ticket & Vouchers", said: "Tickets and vouchers printing are ways for your events to generate more interested audiences, promotes purchases or sign-ups." },
      { slug: "brown-kraft-table-tent", name: "Brown Kraft Table Tent", said: "With a compact multi-faced design, interlocking Wedding Kraft Tent Cards Decorations contain impressive double sided printable space." },
      { slug: "standard-table-tent", name: "Standard Table Tent", said: "A Table Tent is a convenient, self-standing promotional unit created from printed and folded cardstock." },
      { slug: "waterproof-sous-plat", name: "Waterproof Sous Plat", said: "Print & Laminate sous plat which provide highly visible advertising space and are conveniently disposable. Placemat printing for your restaurant & cafe." },
      { slug: "standard-sous-plat", name: "Standard Sous Plat", said: "Print personalised sous plat which provide highly visible advertising space and are conveniently disposable. Placemat printing for your restaurant & cafe." },
      { slug: "posters", name: "Posters", said: "A poster is a temporary promotion of an idea, product, or event put up in a public space for mass consumption." },
      { slug: "paper-stickers", name: "Paper Stickers", said: "A sticker is a small piece of paper or plastic, with writing or a picture on one side, which you can stick onto a surface." },
      { slug: "any-shape-stickers", name: "Any shape Stickers", said: "Die cut stickers are self-adhesive vinyl stickers" },
      { slug: "square-stickers", name: "Square Stickers", said: "Make custom square stickers and labels for your business or just for fun." },
      { slug: "round-stickers", name: "Round Stickers", said: "Design and print personalized Round Stickers & Labels." },
      { slug: "standard-booklets", name: "Standard Booklets", said: "Stapled booklets are often also called saddle stitched booklets. Saddle stitch binding is a really popular method where printed pages are folded, gathered together and then stitched up the fold line with a sturdy metal staple." },
    ],
  },
  {
    name: "Large Prints",
    items: [
      { slug: "sandblast-vinyl-printing", name: "SandBlast Vinyl Printing", said: "Sandblast is great for front entrances and designed for existing windows to give it the frosted appearance.Installation service is available." },
      { slug: "vinyl-print-cut", name: "Vinyl Print & Cut", said: "vinyl printing is a flexible high quality solution for internal and external advertising campaigns,and perfect for vitrine decoration" },
      { slug: "mesh", name: "Mesh", said: "This is a complete printing solution for advertising campaigns.Mesh banners have holes that allow the viewer to see through it.Installation service available" },
      { slug: "window-stick", name: "Window Stick", said: "See Through Window Graphics is printed with waterproof, lightfast inks and can be used outdoors. – Easy installation- one way vision – Vibrant Colors" },
      { slug: "wallpaper", name: "Wallpaper", said: "Print your own wallpaper! Create your own wallpaper and print a picture or pattern of your choice.Installation service available" },
      { slug: "flags", name: "Flags", said: "print any flag you like country flags or your logo on a flag with a metal pole and stand" },
      { slug: "backlit-frontlit-flex-printing", name: "Backlit & Frontlit Flex Printing", said: "Backlit and Frontlit flex printing are used for large format advertising billboard printing.They can be used outdoor and indoor with ease as they are weather resistant." },
    ],
  },
  {
    name: "Bindery Service",
    items: [
      { slug: "thermal-binding", name: "Thermal Binding", said: "A perfect kind of binding for your presentations and for your important documents up to 340 papers" },
      { slug: "velo-bind", name: "Velo Bind", said: "Bind your documents up to 500 papers" },
      { slug: "full-color-hardcover", name: "Full Color Hardcover", said: "Bind your special memories photos or wedding book with a very unique binding style" },
      { slug: "plastic-coil", name: "Plastic Coil", said: "Coil Binding books are like journals, notebooks or cook books that will lay flat or wrap back around themselves." },
      { slug: "saddle-stitched", name: "Saddle-Stitched", said: "Saddle stitch binding is the most popular, inexpensive and simple to make yet professional form of binding, which allows us to save you money." },
    ],
  },
  {
    name: "Design",
    items: [
      { slug: "collage", name: "Collage", said: "Create your photo collage exactly how you want it with our easy-to-use collage builder." },
      { slug: "mosaic", name: "Mosaic", said: "Create an amazing mosaic design using your photos" },
      { slug: "retouching", name: "Retouching", said: "Review photos, edit and make necessary changes. Decide which images to publish. Ensure all assignments are shot and edited on time for publication" },
      { slug: "pro-design", name: "Pro Design", said: "We can help you creating your pro design such as creating logo, Flyer, Menu, brochure,…" },
      { slug: "simple-design", name: "Simple Design", said: "We can help you creating your simple design such as school project, design for t-shirt, greetings cards,…" },
    ],
  },
  {
    name: "Finishing & Binding",
    items: [
      { slug: "map-finishing", name: "Map Finishing", said: "Plot, fold, laminate and bind. Laminate maps to protect them from humidity, dust and tearing. Bind maps into an A0 booklet for future reference and filing purposes." },
      { slug: "mounting-on-plexi", name: "Mounting on Plexi", said: "Mount your posters on various shapes and cut or mold as you desire.Ask for quantity price" },
      { slug: "mounting-on-wood", name: "Mounting on Wood", said: "Mount your posters on various shapes and cut or mold as you desire.Ask for quantity price" },
      { slug: "mounting-on-foam", name: "Mounting on Foam", said: "Mount your posters on various shapes and cut or mold as you desire.Ask for quantity price" },
      { slug: "book-lamination", name: "Book Lamination", said: "Protect our children’s school books & any important book from tearing, wrinkling & dirt." },
    ],
  },
  {
    name: "Canvas Print",
    items: [
      { slug: "stretched-canvas-printing", name: "Stretched Canvas Printing", said: "Once the canvas is printed, the canvas gets stretched onto a frame. Some people opt for a frameless border while others prefer framed canvas prints." },
      { slug: "canvas-printing", name: "Canvas Printing", said: "A canvas print, not to be confused with a canvas painting, is an image printed from an inkjet printer onto canvas." },
      { slug: "large-posters", name: "Large Posters", said: "High quality poster printing for indoor & outdoor use in standard and custom paper sizes with a great range of paper stock and print finishes available." },
      { slug: "large-sticker", name: "Large Sticker", said: "vinyl printing is a flexible high quality solution for internal and external advertising campaigns,and perfect for vitrine decoration" },
    ],
  },
  {
    name: "Document Printing",
    items: [
      { slug: "photocopy-black-white", name: "Photocopy Black & White", said: "We do it in a heart beat! High quality & wide variety of papers" },
      { slug: "photocopy-colored", name: "Photocopy Colored", said: "We do it in a heart beat! High quality & wide variety of papers" },
      { slug: "print-out-black-and-white", name: "Print out Black and White", said: "Black and white printing with the fastest machines and the best quality. Different papers thickness & Textures" },
      { slug: "print-out-colored", name: "Print out Colored", said: "Color printing with the fastest machines and the best quality. Different papers thickness & Textures" },
    ],
  },
  {
    name: "Flyers",
    items: [
      { slug: "brown-kraft-flyers", name: "Brown Kraft Flyers", said: "The natural brown look of the paper is beautifully rustic with an earthy texture. It gives your branding an artisan feel and emphasizes your green brand values. Kraft paper is a popular choice for advertising homemade and organic products." },
      { slug: "sqaure-flyers", name: "Sqaure Flyers", said: "Square Flyer printing is a great way to make a big impression.They’re made to show off visual flair, and will act as a great talking point ahead of your event or product launch." },
      { slug: "laminated-flyers", name: "Laminated Flyers", said: "Print laminated flyers & leaflets with a Matt, Gloss or soft touch finish. High quality laminate printing at low cost. Free UK Delivery on all orders." },
      { slug: "standard-flyers", name: "Standard Flyers", said: "This handy, professional format can give customers all the details they need: menu items, services, contact info and more." },
    ],
  },
  {
    name: "Bracelets",
    items: [
      { slug: "textile-bracelets", name: "Textile Bracelets", said: "Textile bracelets are waterproof, they have low toxicity, and they don’t support the growth of microbes." },
      { slug: "plastic-bracelets", name: "Plastic Bracelets", said: "Plastic bracelets are waterproof, they have low toxicity, and they don’t support the growth of microbes." },
      { slug: "rubber-bracelets", name: "Rubber Bracelets", said: "Rubber bracelets are waterproof, they have low toxicity, and they don’t support the growth of microbes. Rubber is also tough and resistant to shock, wear, friction and pressure." },
    ],
  },
  {
    name: "Brochure",
    items: [
      { slug: "standard-brochure", name: "Standard Brochure", said: "Stapled brochure are often also called saddle stitched brochure. Saddle stitch binding is a really popular method where printed pages are folded, gathered together and then stitched up the fold line with a sturdy metal staple." },
      { slug: "trifold-brochure", name: "Trifold Brochure", said: "A trifold brochure is created by folding a sheet of paper twice, which gives the brochure three panels." },
      { slug: "half-fold-brochure", name: "Half Fold Brochure", said: "A half-fold brochure, also called a bifold brochure, is made up of a single sheet of paper folded into two." },
    ],
  },
  {
    name: "Menus",
    items: [
      { slug: "half-fold-menus", name: "Half-fold Menus", said: "A half-fold is a single sheet menu folded in half. The half-fold is constructed by folding a sheet of paper to create 2 panels on each side of the paper." },
      { slug: "trifold-menus", name: "Trifold Menus", said: "A tri-fold design is perfect for menus that offer a large variety of options and thus need the added room. The common tri-fold menu has six-panels which allows a restaurant to segment its menu and create separate panels for appetizers, sides and entrees." },
      { slug: "flat-menus", name: "Flat Menus", said: "An ideal restaurant menu description is a short one, explains what the dish is, and, ultimately, makes the customer want to order it. Avoid long, incomprehensible food descriptions that leave the customers puzzled about what the dish is." },
    ],
  },
  {
    name: "Packaging",
    items: [
      { slug: "shape-product-boxes", name: "Shape Product Boxes", said: "Custom shape boxes give your products the opportunity to express their personality through different shapes. We offer rigid boxes in any shape any size." },
      { slug: "retail-product-boxes", name: "Retail Product boxes", said: "Retail packaging is what customers see before they get to see your product" },
      { slug: "interlock-product-boxes", name: "Interlock Product Boxes", said: "Custom interlock packaging requires the packaging box to be functional as well as have an appealing appearance to attract customers." },
    ],
  },
  {
    name: "Calendar",
    items: [
      { slug: "wall-calendar", name: "Wall Calendar", said: "With a custom wall calendar, you can share favorite photos and moments with friends and family, all in a thoughtful, practical manner." },
      { slug: "desktop-calendar", name: "Desktop Calendar", said: "Desktop Calendars are excellent advertisting for your business. We custom design and print Desctop Calendars delivered to your office." },
    ],
  },
  {
    name: "Coasters",
    items: [
      { slug: "brown-kraft-coasters", name: "Brown Kraft Coasters", said: "Each beautiful coaster can be tailored to fit any event and an astonishing variety of design icons all printed using a proprietary eco-friendly printing system." },
      { slug: "standard-coasters", name: "Standard Coasters", said: "We provide custom print coaster services for person gifts, wedding gift, event gifts or any advertising needs using coasters" },
    ],
  },
  {
    name: "Foamboard",
    items: [
      { slug: "fomaboard-10-mm", name: "Fomaboard 10 mm", said: "Made from styrene foam with a paper face and can be printed on both sides—dry erase laminate available. Can be displayed in seconds and are perfect for presentations, wall art and more!" },
      { slug: "fomaboard-5mm", name: "Fomaboard 5mm", said: "Made from styrene foam with a paper face and can be printed on both sides—dry erase laminate available. Can be displayed in seconds and are perfect for presentations, wall art and more!" },
    ],
  },
  {
    name: "Food Boxes",
    items: [
      { slug: "bakery-food-boxes", name: "Bakery Food Boxes", said: "Custom printed boxes for bakeries can include various sized bakery boxes for everything from large custom cakes to individual cupcakes or cookies" },
      { slug: "fast-food-boxes", name: "Fast Food Boxes", said: "Custom fast food packaging requires the packaging box to be functional as well as have an appealing appearance to attract customers." },
    ],
  },
  {
    name: "Greetings Cards",
    items: [
      { slug: "square-greetings-cards", name: "Square Greetings Cards", said: "Our Square Custom Card offers all the features of our Custom Cards." },
      { slug: "standard-greetings-cards", name: "Standard Greetings Cards", said: "Custom greeting cards are a popular practice for sending personalized thoughts and best wishes to your friends, family, and colleagues" },
    ],
  },
  {
    name: "Hang Tags",
    items: [
      { slug: "brown-kraft-hang-tags", name: "Brown Kraft Hang Tags", said: "Hang tags are PERFECT for arts and craft projects, candles and soaps, printable invitations, favor box tags, unique business cards and tag projects" },
      { slug: "standard-hang-tags", name: "Standard Hang Tags", said: "Labels that are attached to objects using a thread or tie rather than an adhesive. These labels are usually made of thicker materials, such as heavy paper stock or card; they are die cut with a hole or holes so that they can be hung from an object or display, or threaded onto a h" },
    ],
  },
  {
    name: "Photo Prints",
    items: [
      { slug: "photo-passport", name: "Photo Passport", said: "you can get your IDs photo while you wait. Fast, excellent quality and instant results." },
      { slug: "standard-photo-printing", name: "Standard Photo Printing", said: "Print your photos and keep your memories with our high quality photo printers" },
    ],
  },
  {
    name: "Postcards",
    items: [
      { slug: "conqueror-postcards", name: "Conqueror Postcards", said: "Everything you need to know about The Conqueror postcards. Our virtual postcards are a feature our users love. The postcards arrive in your inbox when you hit certain distances on a challenge, to acknowledge how far you’ve come – and to encourage you to keep going." },
      { slug: "standard-postcards", name: "Standard Postcards", said: "Create custom postcards to spread the word about your business. Choose from our pre-designed templates or upload your own art to promote your business." },
    ],
  },
  {
    name: "Bookmarks",
    items: [
      { slug: "premium-bookmarks", name: "Premium Bookmarks", said: "A bookmark is a thin marking tool, commonly made of card, leather, or fabric, used to keep track of a reader’s progress in a book and allow the reader to easily return to where the previous reading session ended." },
    ],
  },
  {
    name: "Door Hanger",
    items: [
      { slug: "door-hanger", name: "Door Hanger", said: "A Door Hanger is a printed piece, usually rectangular in shape, that is created with a die-cut hole or hook that allows it to suspend from the knob or handle of a door. Most door hangers are promotional in nature and are printed with colorful graphics on one or both sides of dura" },
    ],
  },
  {
    name: "Food Wrapper",
    items: [
      { slug: "food-wrapper", name: "Food Wrapper", said: "Print your own customised food wrapping paper, available in different formats." },
    ],
  },
  {
    name: "Paper Fan",
    items: [
      { slug: "paper-fan", name: "Paper Fan", said: "Custom hand fans are a wonderful tool for keeping your logo in front your audience, while keeping them cool!" },
    ],
  },
];

/**
 * The order the shelf shows them in.
 *
 * The export comes out biggest group first, which puts seventy-two
 * promotional giveaways above the four rows that say "photocopy" and
 * "print out". That is the supplier's business sorted by their volume,
 * not a student's by their need, so the paper jobs come first and the
 * mugs and bracelets sit underneath.
 *
 * A list of names rather than a reshuffled file, so the next change is one
 * line.
 */
const FIRST = [
  "Projects and coursework",
  "Document Printing",
  "Bindery Service",
  "Finishing & Binding",
  "Typing",
  "Lamination",
  "Scan",
  "Photo Prints",
  "Small Prints",
  "Flyers",
  "Stickers",
];

export function printInOrder(): PrintGroup[] {
  const rank = (name: string) => {
    const at = FIRST.indexOf(name);
    return at === -1 ? FIRST.length : at;
  };
  return [...PRINTING].sort((a, b) => rank(a.name) - rank(b.name));
}

/**
 * What we will have to ask anyway, put in the message as blanks.
 *
 * Nearly every quote costs a round trip: they say they want a banner, we
 * ask how many and how big, they answer the next morning. Sending the
 * questions with the request saves that day, and a blank line is a far
 * better prompt than a sentence asking them to remember three things.
 *
 * By the kind of job rather than one fixed set, because the three
 * questions are not the same three. A flash drive has no size, a thesis
 * has pages and copies, and asking somebody for the dimensions of a
 * photocopy is the sort of thing that makes a shop look automated.
 */
export function blanksFor(group: string): string[] {
  const paper = ["Projects and coursework", "Document Printing", "Bindery Service"];
  const big = [
    "Large Prints",
    "Outdoor Large Prints",
    "Display Items",
    "Sign Making",
    "Large Posters",
    "Large Sticker",
    "Canvas Print",
    "Foamboard",
    "Mounting",
  ];
  const branded = ["Promo Prints", "Branding Material", "General items", "Packaging"];

  if (paper.includes(group)) return ["Pages", "Copies", "Binding", "Needed by"];
  if (big.includes(group)) return ["Quantity", "Size", "Needed by"];
  if (branded.includes(group)) return ["Quantity", "What goes on it", "Needed by"];
  return ["Quantity", "Needed by"];
}

export function printCount(): number {
  return PRINTING.reduce((total, one) => total + one.items.length, 0);
}

/** Everything flat, for a search that should not care how it is filed. */
export function printFlat(): (PrintItem & { group: string })[] {
  return PRINTING.flatMap((group) =>
    group.items.map((one) => ({ ...one, group: group.name }))
  );
}
