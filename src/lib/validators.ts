// Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23).
const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function isValidPlate(plate: string): boolean {
  return PLATE_REGEX.test(plate.toUpperCase().replace(/[\s-]/g, ""));
}

// Validação de CPF com dígitos verificadores (algoritmo padrão da Receita Federal).
export function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calcCheckDigit(9) === Number(digits[9]) && calcCheckDigit(10) === Number(digits[10]);
}
