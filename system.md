Novelty Finder:

Chessbox is an online training platform that is meant to be compatible in formats with other chess sites such as chess graph. The main feature is the novelty finder thst can take downloaded chess games and run through them, either as individuals or on mass and find novelty moves from your given repertoire. The repertoire is modelled as a graph to account for transpositions, whil ethe individual games are linked lists. Looking for a match should be base don the first few nodes. The user, when evaluating on mass, should select a repertoire to be able to add to. These suggested new novelties should be examined using a high power stockfish and allow the user to add to their repertoire if desired. Currently, the repertoire is stored locally but this will change later on. The format is currently in json, so maybe mongodb? with the main user details still in postgres. The novelty finder will generate new nodes to the graphs that the user can add manually, depending on whether or not they like the move. They should have the option to veiw the stockfish analysis in the analysis board.


Analysis Board:

This is the closest to completion, and is generic to most chess sites. I like the lichess on the most. Currently there is no working stockfish model. I ideally want a strong model, but the strongets of the strin gmight be too intensive. Im not entirely sure how the api calls will be made, so this is a decision to look into futhetr. Because this feature is nearly done and will be linked back to other features, it is a priority to get implemented. Test borderline and invalid cases here. Potential idea for expansion is to use ai to provide sentences explaining a move. Preset for initial moves that are theory, and otherwise interpreting stockfish. I dont want to spend money on api keys however, so this is an idea for a later date. The eval bar and peice graveyard needs to be urgently added.


Repertoires:

The first repertoires will be saved as graphs imported from chess graph. I want to make a visual builder in the same style as chess graph. This will allow crud and saving reps into folders. Starting off, these will be personal opening repertoires, but eventuall I want to expand this into a private knowledge base of chess theory. Repertoires can be veiwed in the builder mode and in analysis board mode. This will load up the repertoire into an analysis board, with option to allow editing. At a later date, an AI model can be used for an 'add suggestions' section to reccomend changes to the repertoire. The problem is that AI isnt really good enough at chess unless its a really good model and I dont want to pay for api keys. 


Profiles:

The currentt profile system is a complete mess visually. This goes for the settings menu. I want the profile cards to be scrapped, and all of that information to be seen in a typical profile / settings page. This goes for changing passwords, usernames etc. To expand upon that, I want to have security features like rate limiting added to all parts of the porject, especially to the login system. I would also like email verifications, password manager compatibility and in the future, mfa. I like the sign in with google and sign up with googlee features as well. This would be really ideal to have here of possible. I have no intention to publish this yet, so this isnt a big deal now. When we get closer to prod, then this will be more importand. The intention with this project and implementing claude code is to speed up developmrnt for personal use. 


Training toolkit data:

Training toolkit data can be found in the novelty fidner analysis. Finding where the user deviates form a repertoire is useful. This can be in the form of a novelty, or a deviation (which is an incorrect move, according to the repertoire). Of course a deviation doesn't necessarily mrsn its a bad move, and this should be taken into account by use of stockfish. Moves that are made correctly are matching nodes, and shoukd also be saved. Using this info, we can train a model continuously to find weak points, as well as refreshing our knowledge on strong points on occassion and nodes that we do not frequenly hit. In this training exercise, we are put on a blank board with no analysis. There should be a short sequence of moves, not just an individual move, to build repetition. I like the system anki uses for flashcards. Also research aimchess because I know this does it well. This is called the WeakPoints tool in the toolkit. Many more tools will be added to the kit. 


Layout:

The current layout is inspired by chesscom but I do not think this is ideal. I would rather have a home page that is littered with content, rather than a sidebar. Sort of like the chesscom home page, but with links to pages I have. I toolkit square will link to the page of training tools. The analysis board square will link to analysis board page etc. There is some room to play arounf with this here. Not super urgent in theory, but Id like this done first. 



This is the first stage mvp. Now develop a workload to complete all of these tasks, before we move on to second stage mvp



2nd stage:


1. Integration with chess.com analysis. ChessBox is mainly for my personal use and I have a chesscom premium membership. I want everything from this in terms of game review to be ported over for statistics if needed. I also want statistics to show per repertoire thats saved as well as overall. I also want to show that there was clear inspiration from chess graph here, and potentially reach out to the developer and let them know that I have taken inspiration from their idea and am working on this. I'm not sure if thats a good idea just yet. I also know that chess atlas is doing a simialr thing. 


Less ai like: UI + security checks:

UI: avoid

-arrows on every button
-little dots between words
-overusing eyebrows
-cream backgrounds
-one italic word in headlines
-sparkle icons
-everything in a card
-the word quiet and real and genuine
-numbered sections
-pulsating green dots
-blury glows behind hero
-instrument sarif
-coloured left borders
-three icon cards in a row
-pills above the headlines
-made up stats
-two word sentences
-sections fading on a scroll
-two word sentences
-sections fading on a scroll
-dithering



ensure there is a way to delete an account and any terms and conditions and legal stuff is all included somewhere if the user wants to read it. 

update the readme to be more professional

ensure the following (if needed for this app):

-privacy policy
-terms of service
-refund policy
-cookie policy
-cookie consent banner
-check form consents
-no unecessaey data
-audit 3rd party SDKs
-remove dark patterns
-remove hidden fees
-remove fake reviews
-remove unsupported claims
-accesibility alt text
-fix colour contrast
-keyboard navigation
-add business details
--age of consent for kids data
-unsibscribe link in emails
-licens fonts and images
-data deletion requests

Make sure we DO NOT have:

-purple to blue gradient
-gradient hero text
-emojis in your headings
-inter font everywhere
-coloured border cards
-glasmorphism cards
-low-contrast dark mode
-3 icon boxes in a row
-badge above headline
-lucide icons everywhere
-untouched shadcn UI
-fade in on scroll
-curser following beam
-buttons fade on hover
-inconsistent spacing
-em dashes
-generic buzzword copy
-serif italic accents
-space grotesk + instrument sarif
-grain over gradient


PEN TEST / SECURITY (if relevent)

-http/2 rapid reset
-52 char username
-saml bypass
-noauth email spoof
-graphql aliases
-2fa code replay
-redos regex
-jwt alg confusion
-request smuggling
-cache poisoning
-spoofed ip header
-views bypass rls
-math.random tokens
-timing attack
-padding oracle
-prototype pollution
-template injection
-xxe file read
-websocket hijack



Potential workflow is to have an agent for security and pen tests, an agent fort UI and one for feature refining so i can add things i want to change when i do manual testing. 


In terms of UI, I want an art deco / casino royale aesthetic in so far as it would match with the icons i have. do reasearch on pinterest to make a moodboard for context. I will be likely to vhange your ideas here a lot. 


New toolkit ideas:

tournament mode: user can input datea, how many matches and enter specific line training rather than mistake training
Also want an endgame trainer, little ideas on how to impemet that. 

Check to see if lichess player and masters db are open source, as well as if the endgames tablebase is open source