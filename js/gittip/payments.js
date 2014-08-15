/* Bank Account and Credit Card forms
 *
 * These two forms share some common wiring under the Gratipay.payments
 * namespace, and each has unique code under the Gratipay.payments.{cc,ba}
 * namespaces. Each form gets its own page so we only instantiate one of these
 * at a time.
 *
 */

Gratipay.payments = {};


// Common code
// ===========

Gratipay.payments.havePayments = false;

Gratipay.payments.processorAttempts = 0;

Gratipay.payments.submitDeleteForm = function(e) {
    var item = $("#payout").length ? "bank account" : "credit card";
    var slug = $("#payout").length ? "bank-account" : "credit-card";
    var msg = "Really disconnect your " + item + "?";
    if (!confirm(msg)) {
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    jQuery.ajax(
        { url: '/' + slug + '.json'
        , data: {action: "delete"}
        , type: "POST"
        , success: function() {
            window.location.href = '/' + slug + '.html';
          }
        , error: function(x,y,z) {
            select(cur);
            Gratipay.notification("Sorry, something went wrong deleting your " + item + ". :(", 'error');
            console.log(x,y,z);
          }
         }
    );
    return false;
};

Gratipay.payments.onError = function(response) {
    $('button#save').css('opacity', 1);
    var msg = response.status_code + ": " +
        $.map(response.errors, function(obj) { return obj.description }).join(', ');
    Gratipay.forms.showFeedback(null, [msg]);
    return msg;
};

Gratipay.payments.onSuccess = function(data) {
    $('#status').text('working').addClass('highlight');
    setTimeout(function() {
        $('#status').removeClass('highlight');
    }, 8000);
    $('#delete').show();
    Gratipay.forms.clearFeedback();
    $('button#save').css('opacity', 1);
    setTimeout(function() {
        window.location.href = '/' + Gratipay.participantId + '/';
    }, 1000);
};


// Bank Accounts
// =============

Gratipay.payments.ba = {};

Gratipay.payments.ba.init = function(balanced_uri, participantId) {
    Gratipay.participantId = participantId;
    $('#delete form').submit(Gratipay.payments.submitDeleteForm);
    $('#payout').submit(Gratipay.payments.ba.submit);

    // Lazily depend on Balanced.
    var balanced_js = "https://js.balancedpayments.com/1.1/balanced.min.js";
    jQuery.getScript(balanced_js, function() {
        Gratipay.havePayouts = true;
        $('input[type!="hidden"]').eq(0).focus();
    });
};

Gratipay.payments.ba.submit = function (e) {
    e.preventDefault();

    $('button#save').css('opacity', 0.5);
    Gratipay.forms.clearFeedback();

    var bankAccount = {
        name: $('#account_name').val(),
        account_number: $('#account_number').val(),
        routing_number: $('#routing_number').val()
    };

    Gratipay.payments.ba.merchantData = {
        //type: 'person',  // Oooh, may need to vary this some day?
        street_address: $('#address_1').val(),
        postal_code: $('#zip').val(),
        phone_number: $('#phone_number').val(),
        region: $('#state').val(),
        dob_month: $('#dob-month').val(),
        dob_year: $('#dob-year').val(),
        dob_day: $('#dob-day').val(),
        name: $('#name').val()
    };
    var errors = [];


    // Require some fields.
    // ====================
    // We only require fields that are actually on the page. Since we don't
    // load the identity verification fields if they're already verified, not
    // all of these will necessarily be present at all.

    var requiredFields = {
        name: 'Your legal name is required.',
        address_1: 'Your street address is required.',
        zip: 'Your ZIP or postal code is required.',
        phone_number: 'A phone number is required.',
        account_name: 'The name on your bank account is required.',
        account_number: 'Your bank account number is required.',
        routing_number: 'A routing number is required.'
    };
    for (var field in requiredFields) {
        var $f = $('#' + field);
        if (!$f.length)  // Only validate if it's on the page.
            continue;
        var value = $f.val();

        if (!value) {
            $f.closest('div').addClass('error');
            errors.push(requiredFields[field]);
        } else {
            $f.closest('div').removeClass('error');
        }
    }


    // Validate routing number.
    // ========================

    var $rn = $('#routing_number');
    if (bankAccount.routing_number) {
        if (!balanced.bankAccount.validateRoutingNumber(bankAccount.routing_number)) {
            $rn.closest('div').addClass('error');
            errors.push("That routing number is invalid.");
        } else {
            $rn.closest('div').removeClass('error');
        }
    }


    if (errors.length) {
        $('button#save').css('opacity', 1);
        Gratipay.forms.showFeedback(null, errors);
    } else {
        balanced.bankAccount.create( bankAccount
                                   , Gratipay.payments.ba.handleResponse
                                    );
    }
};

Gratipay.payments.ba.handleResponse = function (response) {
    if (response.status_code !== 201) {
        var msg = Gratipay.payments.onError(response);
        $.post('/bank-account.json', {action: 'store-error', msg: msg});
        return;
    }

    /* The request to tokenize the bank account succeeded. Now we need to
     * validate the merchant information. We'll submit it to
     * /bank-accounts.json and check the response code to see what's going
     * on there.
     */

    function detailedFeedback(data) {
        $('#status').text('failing');
        $('#delete').show();
        var messages = [data.error];
        if (data.problem == 'More Info Needed') {
            messages = [ "Sorry, we couldn't verify your identity. Please "
                       + "check, correct, and resubmit your details."
            ];
        }
        Gratipay.forms.showFeedback(data.problem, messages);
        $('button#save').css('opacity', 1);
    }

    var detailsToSubmit = Gratipay.payments.ba.merchantData;
    detailsToSubmit.bank_account_uri = response.bank_accounts[0].href;

    Gratipay.forms.submit( "/bank-account.json"
                       , detailsToSubmit
                       , Gratipay.payments.onSuccess
                       , detailedFeedback
                        );
};


// Credit Cards
// ============

Gratipay.payments.cc = {};

Gratipay.payments.cc.init = function(balanced_uri, participantId) {
    Gratipay.participantId = participantId;
    $('#delete form').submit(Gratipay.payments.submitDeleteForm);
    $('form#payment').submit(Gratipay.payments.cc.submit);

    // Lazily depend on Balanced.
    var balanced_js = "https://js.balancedpayments.com/1.1/balanced.min.js";
    jQuery.getScript(balanced_js, function() {
        Gratipay.havePayments = true;
        $('input[type!="hidden"]').eq(0).focus();
    });
};

Gratipay.payments.cc.submit = function(e) {

    e.stopPropagation();
    e.preventDefault();
    $('button#save').css('opacity', 0.5);
    Gratipay.forms.clearFeedback();

    if (!Gratipay.havePayments) {
        if (Gratipay.paymentProcessorAttempts++ === 50)
            Gratipay.notification( "Gah! Apparently we suck. If you're really motivated, call "
                 + "me (Chad) at 412-925-4220 and we'll figure this out. "
                 + "Sorry. :-("
                  );
        else
            setTimeout(Gratipay.submitPaymentForm, 200);
        return false;
    }


    // Adapt our form lingo to balanced nomenclature.

    function val(field) {
        return $('form#payment input[id="' + field + '"]').val();
    }

    var credit_card = {};   // holds CC info

    credit_card.number = val('card_number');
    if (credit_card.number.search('[*]') !== -1)
        credit_card.number = '';  // don't send if it's the **** version
    credit_card.cvv = val('cvv');
    credit_card.name = val('name');
    country = $('select[id="country"]').val() || null;
    credit_card.meta = { 'address_2': val('address_2')
                       , 'region': credit_card.region // workaround
                       , 'city_town': val('city_town')
                       , 'country': country
                        };

    // XXX We're duping some of this info in both meta and address due to
    // evolution of the Balanced API and our stepwise keeping-up. See:
    // https://github.com/gittip/www.gittip.com/issues/2446 and links from
    // there.
    credit_card.address = { 'line1': val('address_1')
                          , 'line2': val('address_2')
                          , 'city': val('city_town')
                          , 'state': val('state')
                          , 'postal_code': val('zip')
                          , 'country_code': country
                           };

    credit_card.expiration_month = val('expiration_month');
    credit_card.expiration_year = val('expiration_year');

    if (!balanced.card.isCardNumberValid(credit_card.number)) {
        $('button#save').css('opacity', 1);
        Gratipay.forms.showFeedback(null, ["Your card number is bad."]);
    } else if (!balanced.card.isExpiryValid( credit_card.expiration_month
                                         , credit_card.expiration_year
                                          )) {
        $('button#save').css('opacity', 1);
        Gratipay.forms.showFeedback(null, ["Your expiration date is bad."]);
    } else if (!balanced.card.isSecurityCodeValid( credit_card.number
                                               , credit_card.cvv
                                                )) {
        $('button#save').css('opacity', 1);
        Gratipay.forms.showFeedback(null, ["Your CVV is bad."]);
    } else {
        balanced.card.create(credit_card, Gratipay.payments.cc.handleResponse);
    }

    return false;
};

Gratipay.payments.cc.handleResponse = function(response) {
    if (response.status_code !== 201) {
        var msg = Gratipay.payments.onError(response);
        $.post('/credit-card.json', {action: 'store-error', msg: msg});
        return;
    }

    /* The request to create the token succeeded. We now have a single-use
     * token associated with the credit card info. This token can be
     * used to associate the card with a customer. We want to do the
     * latter, and that happens on the server side. When the card is
     * tokenized Balanced performs card validation, so we alredy know the
     * card is good.
     */

    function detailedFeedback(data) {
        $('#status').text('failing');
        $('#delete').show();
        var details = [];
        Gratipay.forms.showFeedback(data.problem, [data.error]);
        $('button#save').css('opacity', 1);
    }

    Gratipay.forms.submit( "/credit-card.json"
                       , {card_uri: response.cards[0].href}
                       , Gratipay.payments.onSuccess
                       , detailedFeedback
                        );
};
