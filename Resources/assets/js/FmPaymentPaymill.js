var FmPaymentPaymill = {
    els: {
        form:   '.paymill',
        submit: '.paymill input[type=submit]',
        number: '.paymill-number input',
        expiry: '.paymill-expiry input',
        holder: '.paymill-holder input',
        cvc:    '.paymill-cvc input',
        errors: '.paymill-errors',
        token:  'input[name="jms_choose_payment_method[data_paymill][token]"]'
    },

    /**
     * @param string amount   "4900" for 49,00 EUR
     * @param string currency ISO 4217 i.e. "EUR"
     */
    init: function (options) {
        this.amount   = options.amount;
        this.currency = options.currency;

        $('[data-numeric]').payment('restrictNumeric');
        $(this.els.number).payment('formatCardNumber');
        $(this.els.expiry).payment('formatCardExpiry');
        $(this.els.cvc).payment('formatCardCVC');

        // Remove previous errors when a field is changed
        $(this.els.form).find('input').keyup(function () {
            $(this).removeClass('error');
        });

        $(this.els.number).keyup(Fm.bind(this.setCardType, this));
        $(this.els.form).submit(Fm.bind(this.onSubmit, this));
    },

    /**
     * Show the card type icon according to the (partial) card number.
     */
    setCardType: function () {
        var number  = $(this.els.number).val();
        var $target = $('.paymill-number');

        $target.removeClass('visa mastercard maestro amex identified');

        var cardType = $.payment.cardType(number);
        if (cardType && number.length >= 4) {
            $target.addClass(cardType).addClass('identified');
        }
    },

    /**
     * Called when the submit button is clicked
     */
    onSubmit: function () {
        $(this.els.form).find('input').removeClass('error');
        this.error('');
        this.enableSubmit(false);

        var number  = $(this.els.number).val();
        var expiry = $(this.els.expiry).payment('cardExpiryVal');
        var cvc     = $(this.els.cvc).val();
        var holder  = $(this.els.holder).val();

        if (!paymill.validateCardNumber(number)) {
            $(this.els.number).addClass('error');
        }

        if (!paymill.validateExpiry(expiry.month, expiry.year)) {
            $(this.els.expiry).addClass('error');
        }

        if (!paymill.validateCvc(cvc, number)) {
            $(this.els.cvc).addClass('error');
        }

        if (holder === '') {
            $(this.els.holder).addClass('error');
        }

        if ($(this.els.form).find('input.error').length) {
            this.enableSubmit();
            return false;
        }

        paymill.createToken({
            number:     number,
            exp_month:  expiry.month,
            exp_year:   expiry.year,
            cvc:        cvc,
            cardholder: holder,
            amount_int: this.amount,
            currency:   this.currency
        }, Fm.bind(this.onResponse, this));

        return false;
    },

    /**
     * Received a response from the Paymill API.
     */
    onResponse: function (error, result) {
        if (error) {
            this.error(error.apierror);
        } else {
            this.error('');
            var form = $(this.els.form);
            form.find(this.els.token).val(result.token);
            form.get(0).submit();
        }

        this.enableSubmit();
    },

    /**
     * Enable or disable the submit button
     */
    enableSubmit: function (enable) {
        if (enable === undefined || enable) {
            $(this.els.submit).removeAttr('disabled');
        } else {
            $(this.els.submit).attr('disabled', 'disabled');
        }
    },

    /**
     * Show an error message
     */
    error: function (message) {
        $(this.els.errors).text(message);
    }
};

// Create a function bound to a given object (assigning this, and arguments,
// optionally). Borrowed from underscore.js
var Fm = {
    bind: function(func, context) {
        var args, bound;
        args = Array.prototype.slice.call(arguments, 2);
        return bound = function() {
            if (!(this instanceof bound)) return func.apply(context, args.concat(Array.prototype.slice.call(arguments)));
            ctor.prototype = func.prototype;
            var self = new ctor;
            ctor.prototype = null;
            var result = func.apply(self, args.concat(Array.prototype.slice.call(arguments)));
            if (Object(result) === result) return result;
            return self;
        };
    }
};