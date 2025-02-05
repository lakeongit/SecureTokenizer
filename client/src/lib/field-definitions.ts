export type FieldCategory = {
  name: string;
  description: string;
  fields: {
    id: string;
    name: string;
    description: string;
    placeholder: string;
    validation?: {
      pattern: string;
      message: string;
    };
  }[];
};

export const fieldCategories: FieldCategory[] = [
  {
    name: "Healthcare",
    description: "Medical and healthcare information",
    fields: [
      {
        id: "patient_id",
        name: "Patient ID",
        description: "Healthcare patient identifier",
        placeholder: "Patient ID number",
        validation: {
          pattern: "^[A-Z0-9]{4,10}$",
          message: "Patient ID must be 4-10 characters (letters and numbers)"
        }
      },
      {
        id: "diagnosis_code",
        name: "Diagnosis Code",
        description: "Medical diagnosis code",
        placeholder: "ICD-10 code"
        // Removed validation rules to accept any format
      },
      {
        id: "medication_id",
        name: "Medication ID",
        description: "Prescription medication identifier",
        placeholder: "Medication ID",
        validation: {
          pattern: "^[A-Z0-9]{5,10}$",
          message: "Medication ID must be 5-10 characters (letters and numbers)"
        }
      }
    ]
  },
  {
    name: "Financial",
    description: "Banking and payment information",
    fields: [
      {
        id: "card_number",
        name: "Credit Card Number",
        description: "16-digit payment card number",
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        validation: {
          pattern: "^\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}$",
          message: "Please enter a valid 16-digit card number"
        }
      },
      {
        id: "cvv",
        name: "CVV",
        description: "Card verification value",
        placeholder: "123",
        validation: {
          pattern: "^\\d{3,4}$",
          message: "CVV must be 3 or 4 digits"
        }
      },
      {
        id: "bank_account",
        name: "Bank Account",
        description: "Bank account number",
        placeholder: "Account number",
        validation: {
          pattern: "^\\d{8,17}$",
          message: "Bank account number must be between 8 and 17 digits"
        }
      },
      {
        id: "iban",
        name: "IBAN",
        description: "International Bank Account Number",
        placeholder: "International bank account number",
        validation: {
          pattern: "^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$",
          message: "Please enter a valid IBAN format"
        }
      },
      {
        id: "routing_number",
        name: "Routing Number",
        description: "Bank routing number",
        placeholder: "9-digit routing number",
        validation: {
          pattern: "^\\d{9}$",
          message: "Routing number must be exactly 9 digits"
        }
      }
    ]
  },
  {
    name: "Identity",
    description: "Personal identification information",
    fields: [
      {
        id: "ssn",
        name: "Social Security Number",
        description: "US Social Security Number",
        placeholder: "XXX-XX-XXXX",
        validation: {
          pattern: "^\\d{3}-?\\d{2}-?\\d{4}$",
          message: "Please enter a valid SSN (XXX-XX-XXXX)"
        }
      },
      {
        id: "drivers_license",
        name: "Driver's License",
        description: "Driver's license number",
        placeholder: "License number",
        validation: {
          pattern: "^[A-Z0-9]{6,14}$",
          message: "Driver's license must be 6-14 characters (letters and numbers)"
        }
      },
      {
        id: "passport",
        name: "Passport Number",
        description: "International passport number",
        placeholder: "Passport number",
        validation: {
          pattern: "^[A-Z0-9]{6,9}$",
          message: "Passport number must be 6-9 characters (letters and numbers)"
        }
      }
    ]
  }
];

export const getAllFields = () =>
  fieldCategories.flatMap(category =>
    category.fields.map(field => ({
      ...field,
      category: category.name
    }))
  );

export const validateField = (fieldId: string, value: string): { isValid: boolean; message?: string } => {
  // Normalize the field ID by converting to lowercase and replacing spaces with underscores
  const normalizedFieldId = fieldId.toLowerCase().replace(/\s+/g, '_');

  // Find the field by normalized ID or by matching the normalized name
  const field = getAllFields().find(f =>
    f.id.toLowerCase() === normalizedFieldId ||
    f.name.toLowerCase().replace(/\s+/g, '_') === normalizedFieldId
  );

  if (!field?.validation) {
    return { isValid: true };
  }

  const regex = new RegExp(field.validation.pattern);
  return {
    isValid: regex.test(value),
    message: regex.test(value) ? undefined : field.validation.message
  };
};