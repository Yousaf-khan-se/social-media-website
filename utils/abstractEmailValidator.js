/*
basic email validator using Abstract API for free plan
const axios = require('axios');
axios.get('https://emailvalidation.abstractapi.com/v1/?api_key=d87173c913bf4df5a09f763913eb2dc0&email=m.yousaf.khan.se@gmail.com')
    .then(response => {
    })
    .catch(error => {
    });


response:
{
    "email": "johnsmith@gmail.com",
        "autocorrect": "",
            "deliverability": "DELIVERABLE",
                "quality_score": 0.9,
                    "is_valid_format": {
        "value": true,
            "text": "TRUE"
    },
    "is_free_email": {
        "value": true,
            "text": "TRUE"
    },
    "is_disposable_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_role_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_catchall_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_mx_found": {
        "value": true,
            "text": "TRUE"
    },
    "is_smtp_valid": {
        "value": true,
            "text": "TRUE"
    }
}


Official DOcumentation from : https://docs.abstractapi.com/email-validation?_gl=1*yb49i1*_gcl_au*NTQwNTYyMjUwLjE3NTQ1MTE5NjYuMjg4ODgyMjE4LjE3NTQ1MTIwMjAuMTc1NDUxMzAzNA..#getting-started
Getting Started
Abstract’s Email Validation and Verification API requires only your unique API key api_key and a single email email:

Copy
https://emailvalidation.abstractapi.com/v1/
? api_key = YOUR_UNIQUE_API_KEY
    & email = johnsmith @gmail.com
This was a successful request, and all available details about that email were returned:

Request parameters

api_key
stringrequired
Your unique API key.Note that each user has unique API keys for each of Abstract’s APIs, so your Email Validation API key will not work for your IP Geolocation API, for example.

    email
Stringrequired
The email address to validate.

    auto_correct
Boolean
You can chose to disable auto correct.To do so, just input false for the auto_correct param.By default, auto_correct is turned on.

Response parameters
The API response is returned in a universal and lightweight JSON format.

    email
String
The value for “email” that was entered into the request.

    auto_correct
String
If a typo has been detected then this parameter returns a suggestion of the correct email(e.g., johnsmith@gmial.com => johnsmith@gmail.com).If no typo is detected then this is empty.

    deliverability
String
Abstract’s evaluation of the deliverability of the email.Possible values are: DELIVERABLE, UNDELIVERABLE, and UNKNOWN.

    quality_score
Float
An internal decimal score between 0.01 and 0.99 reflecting Abstract’s confidence in the quality and deliverability of the submitted email.

    is_valid_format
Boolean
Is true if the email follows the format of “address @domain.TLD”. If any of those elements are missing or if they contain extra or incorrect special characters, then it returns false.

    is_free_email
Boolean
Is true if the email’s domain is found among Abstract’s list of free email providers Gmail, Yahoo, etc.

    is_disposable_email
Boolean
Is true if the email’s domain is found among Abstract’s list of disposable email providers(e.g., Mailinator, Yopmail, etc).

    is_role_email
Boolean
Is true if the email’s local part(e.g., the “to” part) appears to be for a role rather than individual.Examples of this include “team @”, “sales @”, info @”, etc.

    is_catchall_email
Boolean
Is true if the domain is configured to catch all email.

    is_mx_found
Boolean
Is true if MX Records for the domain can be found.Only available on paid plans.Will return null and UNKNOWN on free plans.

    is_smtp_valid
Boolean
Is true if the SMTP check of the email was successful.If the check fails, but other checks are valid, we’ll return the email as UNKNOWN.We recommend not blocking signups or form submissions when an SMTP check fails.

Request examples

Checking a misspelled email
In the example below, we show the request and response when the API detects a possible misspelling in the requested email.
Note that even if a possible misspelling is detected, all of the other checks on that email(e.g., free email, disposable domain, etc) will still be done against the original submitted email, not against the autocorrected email.

    Copy
https://emailvalidation.abstractapi.com/v1/
? api_key = YOUR_UNIQUE_API_KEY
    & email = johnsmith @gmial.con
The request was valid and successful, and so it returns the following:

Copy
{
    "email": "johnsmith@glmai.com",
        "autocorrect": "johnsmith@gmail.com",
            "deliverability": "UNDELIVERABLE",
                "quality_score": 0.0,
                    "is_valid_format": {
        "value": true,
            "text": "TRUE"
    },
    "is_free_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_disposable_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_role_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_catchall_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_mx_found": {
        "value": false,
            "text": "FALSE"
    },
    "is_smtp_valid": {
        "value": false,
            "text": "FALSE"
    }
}

Checking a malformed email
In the example below, we show the request and response for an email does not follow the proper format.If the email fails the is_valid_format check, then the other checks(e.g., is_free_email, is_role_email) will not be performed and will be returned as false

Copy
https://emailvalidation.abstractapi.com/v1/
? api_key = YOUR_UNIQUE_API_KEY
    & email = johnsmith
The request was valid and successful, and so it returns the following:

Copy
{
    "email": "johnsmith",
        "autocorrect": "",
            "deliverability": "UNDELIVERABLE",
                "quality_score": 0.0,
                    "is_valid_format": {
        "value": false,
            "text": "FALSE"
    },
    "is_free_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_disposable_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_role_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_catchall_email": {
        "value": false,
            "text": "FALSE"
    },
    "is_mx_found": {
        "value": false,
            "text": "FALSE"
    },
    "is_smtp_valid": {
        "value": false,
            "text": "FALSE"
    }
}

Bulk upload(CSV)
Don’t know how to or don’t want to make API calls ? Use the bulk CSV uploader to easily use the API.The results will be sent to your email when ready.
Here are some best practices when bulk uploading a CSV file:
Ensure the first column contains the email addresses to be analyzed.
Remove any empty rows from the file.
Include only one email address per row.
The maximum file size permitted is 50,000 rows.

Response and error codes
Whenever you make a request that fails for some reason, an error is returned also in the JSON format.The errors include an error code and description, which you can find in detail below.
Code	Type	Details
200	OK	Everything worked as expected.
400	Bad request	Bad request.
401	Unauthorized	The request was unacceptable.Typically due to the API key missing or incorrect.
422	Quota reached	The request was aborted due to insufficient API credits. (Free plans)
429	Too many requests	The request was aborted due to the number of allowed requests per second being reached.This happens on free plans as requests are limited to 1 per second.
500	Internal server error	The request could not be completed due to an error on the server side.
503	Service unavailable	The server was unavailable.

Code samples and libraries
Please see the top of this page for code samples for these languages and more.If we’re missing a code sample, or if you’d like to contribute a code sample or library in exchange for free credits, email us at: team @abstractapi.com

Other notes
A note on metered billing: Each individual email you submit counts as a credit used.Credits are also counted per request, not per successful response.So if you submit a request for the(invalid) email address “kasj8929hs”, that still counts as 1 credit.


I have subscribe free plan of Abstract email validator to validate emails on time of registeration
*/