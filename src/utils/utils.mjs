const AUDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
});

const dateFormat = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'long',
    timeZone: 'Australia/Sydney',
});

export const isoTestString = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z?$/;
export const nsEmailTest = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/ig;
export const standardEmailTest = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/;
export const simpleNsEmailTest = /^(\S)+@(\w|\.)+(\.)+(\w)+$/gi;

export const VARS = {
    pageTitle: 'Page Loading...',
}

export const rules = {
    email(value, fieldName = 'This field') {
        return !value
            || nsEmailTest.test(value)
            || `${fieldName} must be a valid email`;
    },
    required(value, fieldName = 'This field') {
        return !!value || `${fieldName} is required`;
    },
    minLength(value, fieldName = 'This field', length) {
        return !value || (value && value.length >= length) || `${fieldName} should have more than ${length} characters`;
    },
    maxLength(value, fieldName = 'This field', length) {
        return !value || (value && value.length <= length) || `${fieldName} should have less than ${length} characters`;
    },
    abn(value, fieldName = 'This field') {
        if (!value) return true;

        let weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
            checksum = value.split('').map(Number).reduce(
                function(total, digit, index) {
                    if (!index) {
                        digit--;
                    }
                    return total + (digit * weights[index]);
                },
                0
            );

        return value.length === 11 || !(!checksum || checksum % 89 !== 0) || `${fieldName} must be a valid ABN`;
    },
    ausPhone(value, fieldName = 'This field') {
        let australiaPhoneFormat = /^(\+\d{2}[ -]{0,1}){0,1}(((\({0,1}[ -]{0,1})0{0,1}\){0,1}[2|3|7|8]{1}\){0,1}[ -]*(\d{4}[ -]{0,1}\d{4}))|(1[ -]{0,1}(300|800|900|902)[ -]{0,1}((\d{6})|(\d{3}[ -]{0,1}\d{3})))|(13[ -]{0,1}([\d -]{5})|((\({0,1}[ -]{0,1})0{0,1}\){0,1}4{1}[\d -]{8,10})))$/;
        return !value || australiaPhoneFormat.test(value) || `${fieldName} must be a valid phone number`;
    },

    validate(v, validationString, fieldName = 'This field') {
        let validations = validationString.split('|');

        for (let validation of validations) {
            if (validation === 'validate') continue;

            let terms = validation.split(':');
            let rule = terms.shift();
            terms = terms.length ? terms[0].split(',') : [];
            let result = rules[rule] ? rules[rule](v, fieldName || 'Field', ...terms) : null;

            if (typeof result === 'string') return result;
        }

        return true
    }
}


export function getWindowContext() {
    if (window.location.href.includes('app.netsuite.com')) return window;
    else return top;
}

export function allowOnlyNumericalInput(evt) {
    if ((evt.key === 'a' || evt.key === 'c' || evt.key === 'v') && evt.ctrlKey) // allow select all and copy
        return true;

    // if (!/^[-+]?[0-9]*?[0-9]*$/.test(expect)) // Allow only 1 leading + sign and numbers
    if (!/^[0-9]*$/.test(evt.key) && evt.key.length === 1) // Allow only numbers, assuming evt.key is a string
        evt.preventDefault();
    else return true;
}

export function getDialogWidth({md, lg, smAndDown}) {
    if (smAndDown.value) return '95vw';
    else if (md.value) return '75vw';
    else if (lg.value) return '60vw';
    else return '40vw';
}

export function getTodayDate() {
    return new Date(new Date().setHours(new Date().getTimezoneOffset()/-60, 0, 0))
}

export function readFileAsBase64(fileObject) {
    return new Promise((resolve, reject) => {
        if (!fileObject) resolve(null);

        let reader = new FileReader();

        reader.onload = (event) => {
            try {
                resolve(event.target.result.split(',')[1]);
            } catch (e) {reject(e);}
        }
        reader.readAsDataURL(fileObject);
    });
}

export function debounce(fn, wait){
    let timer;
    return function(...args){
        if(timer) {
            clearTimeout(timer); // clear any pre-existing timer
        }
        const context = this; // get the current context
        timer = setTimeout(()=>{
            fn.apply(context, args); // call the function if time expires
        }, wait);
    }
}

export function offsetDateObjectForNSDateField(dateObject) {
    if (Object.prototype.toString.call(dateObject) === '[object String]' && isoTestString.test(dateObject)) dateObject = new Date(dateObject);

    if (Object.prototype.toString.call(dateObject) !== '[object Date]') return dateObject;

    return dateObject.getFullYear() + '-' + `${dateObject.getMonth() + 1}`.padStart(2, '0') + '-' + `${dateObject.getDate()}`.padStart(2, '0') + 'T00:00:00.000';
}

export function waitMilliseconds(millis = 1000) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), millis)
    })
}

export function formatPrice(price) {
    return AUDollar.format(price);
}

export function formatDate(date) {
    return dateFormat.format(date)
}

export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}