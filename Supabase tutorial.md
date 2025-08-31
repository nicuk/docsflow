Supabase works through a mixture of JWT and Key auth.

If no Authorization header is included, the API will assume that you are making a request with an anonymous user.

If an Authorization header is included, the API will "switch" to the role of the user making the request. See the User Management section for more details.

We recommend setting your keys as Environment Variables.

Client API Keys
Client keys allow "anonymous access" to your database, until the user has logged in. After logging in the keys will switch to the user's own login token.

In this documentation, we will refer to the key using the name SUPABASE_KEY.

We have provided you a Client Key to get started. You will soon be able to add as many keys as you like. You can find the anon key in the API Settings page.

CLIENT API KEY
const SUPABASE_KEY = 'SUPABASE_CLIENT_API_KEY'
Example usage
const SUPABASE_URL = "https://lhcopwwiqwjpzbdnjovo.supabase.co"
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_KEY);
Service Keys
Service keys have FULL access to your data, bypassing any security policies. Be VERY careful where you expose these keys. They should only be used on a server and never on a client or browser.

In this documentation, we will refer to the key using the name SERVICE_KEY.

We have provided you with a Service Key to get started. Soon you will be able to add as many keys as you like. You can find the service_role in the API Settings page.

SERVICE KEY
const SERVICE_KEY = 'SUPABASE_SERVICE_KEY'
Example usage
const SUPABASE_URL = "https://lhcopwwiqwjpzbdnjovo.supabase.co"
const supabase = createClient(SUPABASE_URL, process.env.SERVICE_KEY);



User Management
Supabase makes it easy to manage your users.

Supabase assigns each user a unique ID. You can reference this ID anywhere in your database. For example, you might create a profiles table references the user using a user_id field.

Supabase already has built in the routes to sign up, login, and log out for managing users in your apps and websites.

Sign up
Allow your users to sign up and create a new account.

After they have signed up, all interactions using the Supabase JS client will be performed as "that user".

User signup
let { data, error } = await supabase.auth.signUp({
  email: 'someone@email.com',
  password: 'atvmEOtUdsFoobtZgxVm'
})
Log in with Email/Password
If an account is created, users can login to your app.

After they have logged in, all interactions using the Supabase JS client will be performed as "that user".

User login
let { data, error } = await supabase.auth.signInWithPassword({
  email: 'someone@email.com',
  password: 'atvmEOtUdsFoobtZgxVm'
})
Log in with Magic Link via Email
Send a user a passwordless link which they can use to redeem an access_token.

After they have clicked the link, all interactions using the Supabase JS client will be performed as "that user".

User login
let { data, error } = await supabase.auth.signInWithOtp({
  email: 'someone@email.com'
})
Sign Up with Phone/Password
A phone number can be used instead of an email as a primary account confirmation mechanism.

The user will receive a mobile OTP via sms with which they can verify that they control the phone number.

You must enter your own twilio credentials on the auth settings page to enable sms confirmations.

Phone Signup
let { data, error } = await supabase.auth.signUp({
  phone: '+13334445555',
  password: 'some-password'
})
Login via SMS OTP
SMS OTPs work like magic links, except you have to provide an interface for the user to verify the 6 digit number they receive.

You must enter your own twilio credentials on the auth settings page to enable SMS-based Logins.

Phone Login
let { data, error } = await supabase.auth.signInWithOtp({
  phone: '+13334445555'
})
Verify an SMS OTP
Once the user has received the OTP, have them enter it in a form and send it for verification

You must enter your own twilio credentials on the auth settings page to enable SMS-based OTP verification.

Verify Pin
let { data, error } = await supabase.auth.verifyOtp({
  phone: '+13334445555',
  token: '123456',
  type: 'sms'
})
Log in with Third Party OAuth
Users can log in with Third Party OAuth like Google, Facebook, GitHub, and more. You must first enable each of these in the Auth Providers settings here .

View all the available Third Party OAuth providers

After they have logged in, all interactions using the Supabase JS client will be performed as "that user".

Generate your Client ID and secret from: Google, GitHub, GitLab, Facebook, Bitbucket.

Third Party Login
let { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github'
})
User
Get the JSON object for the logged in user.

Get User
const { data: { user } } = await supabase.auth.getUser()
Forgotten Password Email
Sends the user a log in link via email. Once logged in you should direct the user to a new password form. And use "Update User" below to save the new password.

Password Recovery
let { data, error } = await supabase.auth.resetPasswordForEmail(email)
Update User
Update the user with a new email or password. Each key (email, password, and data) is optional

Update User
const { data, error } = await supabase.auth.updateUser({
  email: "new@email.com",
  password: "new-password",
  data: { hello: 'world' }
})
Log out
After calling log out, all interactions using the Supabase JS client will be "anonymous".

User logout
let { error } = await supabase.auth.signOut()
Send a User an Invite over Email
Send a user a passwordless link which they can use to sign up and log in.

After they have clicked the link, all interactions using the Supabase JS client will be performed as "that user".

This endpoint requires you use the service_role_key when initializing the client, and should only be invoked from the server, never from the client.

Invite User
let { data, error } = await supabase.auth.admin.inviteUserByEmail('someone@email.com')