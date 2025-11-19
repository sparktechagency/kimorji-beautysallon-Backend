
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const formatPhoneNumber = (number: string): string => {
  const phoneNumber = parsePhoneNumberFromString(number);

  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error('Invalid phone number. Please enter a valid number.');
  }

  return phoneNumber.format('E.164'); 
};