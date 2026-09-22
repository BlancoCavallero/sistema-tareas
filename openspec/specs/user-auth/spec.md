# user-auth Specification

## Purpose

Single-password authentication for the public organizer site. Because the app is deployed on a public `*.pages.dev` URL, a mandatory gate protects every data route: visitors must present a valid HMAC-signed session cookie before any task data is served or mutated. Passwords are verified with PBKDF2 (WebCrypto) at login only; sessions are verified with HMAC on every request so the 10 ms Workers Free CPU budget is respected.

## Requirements

### Requirement: Password gate on all data routes

The system MUST reject every request to a data route (any route other than the login page) that does not carry a valid session cookie, and MUST redirect unauthenticated visitors to the login page. The gate MUST be effective before any data route is served or any data is read or written.

#### Scenario: Unauthenticated visitor is redirected

- GIVEN a visitor with no session cookie
- WHEN the visitor requests a data route
- THEN the visitor is redirected to the login page
- AND no data is read or written

#### Scenario: Authenticated visitor passes the gate

- GIVEN a visitor with a valid session cookie
- WHEN the visitor requests a data route
- THEN the request proceeds and data is served

### Requirement: Password login with PBKDF2 verification

The system MUST verify the submitted password at login using PBKDF2 (WebCrypto) with a salt and an iteration count between 10,000 and 25,000. The system MUST NOT verify the password on any request other than login.

#### Scenario: Correct password

- GIVEN the login page with the correct password submitted
- WHEN the user submits the login form
- THEN the password is verified with PBKDF2
- AND an HMAC-signed session cookie is issued
- AND the user is redirected to the app

#### Scenario: Wrong password

- GIVEN the login page with an incorrect password submitted
- WHEN the user submits the login form
- THEN the login is rejected with a generic error message
- AND no session cookie is set

### Requirement: HMAC-signed session cookie

The system MUST issue a session cookie signed with HMAC using a secret read from a Pages environment variable, and MUST validate the cookie signature on every request. The signing secret MUST NOT be stored in the repository.

#### Scenario: Tampered cookie is rejected

- GIVEN a session cookie whose payload was modified after signing
- WHEN the visitor requests a data route
- THEN the cookie is treated as invalid
- AND the visitor is redirected to the login page

#### Scenario: Missing signing secret

- GIVEN a deployment where the Pages environment variable is unset
- WHEN any request reaches the auth gate
- THEN the gate fails closed and no session is issued

### Requirement: Logout

The system MUST destroy the session cookie on logout so the visitor is no longer authenticated.

#### Scenario: Logout ends the session

- GIVEN an authenticated user
- WHEN the user logs out
- THEN the session cookie is destroyed
- AND subsequent requests to data routes are redirected to the login page