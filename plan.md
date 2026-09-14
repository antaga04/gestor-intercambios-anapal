# create the plan with steps for a mono repo project similar to the imprffctgames one

a web app for admons (administraciones de lotería [españolas]) to manage a specific type of exchage of lottery.

## pages

### public

- landing: basic info of the event
- login, register, forgot password

### private

we will have roles: superadmin just me the dev (configure by hand), admin, user.

- dashboard: basic info of their operations and instructions. like their last operation or something, some stats and a few operation btns
- profile
- exchanges: list of exchanges with some basic filters, search and actions
- exchanges/:id
  - new: for creating
  - /:id for looking an exchange
- my lottery: import and show their numbers

## logic

### users

users will be public to other users and their info

### exchanges

2 type of exchanges that'll work automatically:

- unidirectional: one user gives to another loterry
- bidirectional: two users give each other lottery

a new exchange will need a user to exchange with. if only one user, user A creates a exchange with another user B, it's one direction. if the same user B creates an exchange with that user A, it becomes bidirectional. for this to happen, both users will have an inbox to accept an exchange and check the data from the exchange.

an exchange will consist in a list of lottery to exchange. that list will have rows of unique numbers in that exchange, each row will be of one of three types (billete, 1 décimo, multiple décimos [of the same number]).

billete means 10 décimos, so we can use natural number to set the amount. we always count them in base billete so 1 décimo will count as 0.1 and múltiple décimos (but of the same number) like 3 will count as 0.3 to the total amount.

more info there but optional. for context, there are 100k different numbers, of each one of those there are 192 billetes (also known as series) which are 1920 décimos. to identify a décimo, they also have numbers for serie and fraction e.g. serie 3 franction 3. fractions go from 1-10. each serie always has 1-10 fractions because they are composed of 10 décimos each. so for each row, depending on the type we can also reference those values. for billetes type, we can set the range of series, e.g. from 35 to 74 both included (which must match the amount set). for 1 décimo, we can include serie and fraction. and for mulitple décimos, serie and the fractions. so we hva to design a system that supports all these cases.

each row can either be signed or unsigned. so we need a checkbox to store if that number will be signed.

for the numbers, the user can upload a list of their numbers to be able to check if they have that number and reduce errors. if no list, no check.

#### adding logic

we can manually add rows there must be 2 other ways. scanning with a bar code scanner or scanning with an on device camera. the number will be read and the info will be extracted. depending on the selected type the info will be treated different. for billetes, scanning a décimo, any décimo of a serie will store that serie as the beginning one and the second scan will set the finish (support for both ways, scanning the lower serie first and then the greater with that condition and viceversa), no fractions here each serie will have the 10. for 1 décimo, it will get serie and fraction. for mútiple décimos (remember, same number but could be different serie and fraction), each scan will do the same as one décimo.

### more logic

- emails only and for register verification
  - for reset password no email, we will manage this with the admin panel, the user will request forgot password and the admin will set one for them, later the user will be able to change their password in the profile
- we use refresh tokens to avoid at any cost sending emails, we only have 3000 per month
- for each exchange we can:
  - edit
  - view
  - delete
  - preview a pdf of the data and donwload it
- download all of the pdfs (template in public directory)
- list of the control of exchange of the user
  - to know how many envelopes the user gives and how many they recieve back. not just that but a full list of the exchanges that shows basic info and if they recieve, give or both for that row

## details

- all the webapp in spanish, for spanish people (mentioned for the formats of things like dates)
- sidebar for private routes
- shadcn for components
- lucide react components
- colors and assets in the new directory

## admin panel

- see the full picture of the exchanges of each user
- be able to download all of list of control of each user
- reset password for a user
- info of last conexion of each user
- some basic usage stats

## deploy

- vercel for client and server
- mongo atlas for the db

so probably no docker needed nor makefile

## configs

- prettier and eslint, pnpm and a private license (the git repo will be private but still)
- basic readme

## tech stack

like the imprffctgames project
