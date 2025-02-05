export type FieldCategory = {
  name: string;
  description: string;
  fields: {
    id: string;
    name: string;
    description: string;
    placeholder: string;
    validation?: string;
  }[];
};

export const fieldCategories: FieldCategory[] = [
  {
    name: "Financial",
    description: "Banking and payment information",
    fields: [
      {
        id: "card_number",
        name: "Credit Card Number",
        description: "16-digit payment card number",
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        validation: "^[0-9-]{16,19}$"
      },
      {
        id: "cvv",
        name: "CVV",
        description: "Card verification value",
        placeholder: "123",
        validation: "^[0-9]{3,4}$"
      },
      {
        id: "bank_account",
        name: "Bank Account",
        description: "Bank account number",
        placeholder: "Account number",
      },
      {
        id: "iban",
        name: "IBAN",
        description: "International Bank Account Number",
        placeholder: "International bank account number",
      },
      {
        id: "routing_number",
        name: "Routing Number",
        description: "Bank routing number",
        placeholder: "9-digit routing number",
        validation: "^[0-9]{9}$"
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
        validation: "^[0-9-]{9,11}$"
      },
      {
        id: "drivers_license",
        name: "Driver's License",
        description: "Driver's license number",
        placeholder: "License number"
      },
      {
        id: "passport",
        name: "Passport Number",
        description: "International passport number",
        placeholder: "Passport number"
      }
    ]
  },
  {
    name: "Healthcare",
    description: "Medical and healthcare information",
    fields: [
      {
        id: "patient_id",
        name: "Patient ID",
        description: "Healthcare patient identifier",
        placeholder: "Patient ID number"
      },
      {
        id: "diagnosis_code",
        name: "Diagnosis Code",
        description: "Medical diagnosis code",
        placeholder: "ICD-10 code"
      },
      {
        id: "medication_id",
        name: "Medication ID",
        description: "Prescription medication identifier",
        placeholder: "Medication ID"
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
