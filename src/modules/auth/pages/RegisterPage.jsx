import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadImage } from '../../core/lib/imageService';
import { saveSession } from '../../core/lib/session';
import { recordActivity } from '../hooks/useInactivityTimeout';
import { login, register, sendRegisterOtp } from '../services/authService';
import { useLocalidades } from '../../users/hooks/useLocalidades';
import { PASSWORD_RULES, validatePassword } from '../utils/passwordPolicy';
import styles from './RegisterPage.module.css';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Validación de teléfono colombiano: exactamente 10 dígitos, solo números, empieza por 3
export const PHONE_REGEX = /^3\d{9}$/;

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

// Mismas reglas que valida el back para la fecha de nacimiento (RF-01)
const EDAD_MINIMA = 18;
const ANIO_MINIMO = 1900;

// Fecha máxima permitida para ser mayor de edad (hoy menos EDAD_MINIMA años en formato AAAA-MM-DD)
function getMaxAdultBirthDate() {
  const today = new Date();
  const year = today.getFullYear() - EDAD_MINIMA;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mientras escribe deja solo números y pone las barras: "15051995" -> "15/05/1995"
function formatBirthDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

// "AAAA-MM-DD" (lo que devuelve el calendario) -> "dd/mm/aaaa"
function fromIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// "dd/mm/aaaa" -> "AAAA-MM-DD" (formato que recibe el back); null si la fecha no existe
function toIsoDate(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (year < ANIO_MINIMO || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isAdultBirthDate(isoDate) {
  return isoDate <= getMaxAdultBirthDate();
}

const ROLE_OPTIONS = [
  {
    id: 'CONTRATANTE',
    title: 'Quiero contratar',
    desc: 'Busco personas de confianza para resolver trabajos.',
    roles: ['CONTRATANTE'],
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'TRABAJADOR',
    title: 'Quiero ofrecer mi oficio',
    desc: 'Quiero mostrar mi trabajo y recibir solicitudes.',
    roles: ['TRABAJADOR'],
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 'AMBOS',
    title: 'Quiero hacer ambas cosas',
    desc: 'Contratar servicios y ofrecer mi oficio con una cuenta.',
    roles: ['CONTRATANTE', 'TRABAJADOR'],
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();

  // Rol seleccionado ('CONTRATANTE' | 'TRABAJADOR' | 'AMBOS')
  const [selectedRoleId, setSelectedRoleId] = useState('CONTRATANTE');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDateTouched, setBirthDateTouched] = useState(false);
  const [localityId, setLocalityId] = useState('');
  const localidades = useLocalidades();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  // Se activa al dar clic en "Crear mi cuenta" para resaltar lo que falta
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Teléfonos: 1 a 3 filas, por defecto 1 marcada como principal
  const [phones, setPhones] = useState([
    { number: '', principal: true },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);
  const birthDatePickerRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // El correo se valida al salir del campo; si ya se mostró el error, se revalida mientras corrige
  const emailInvalid = emailTouched && email.trim() !== '' && !validateEmail(email);

  // Errores por campo: se muestran tras intentar enviar y se actualizan mientras el usuario corrige
  const REQUIRED_MSG = 'Este campo es obligatorio.';
  const isoBirthDate = toIsoDate(birthDate);
  const nameError = submitted && !name.trim() ? REQUIRED_MSG : null;
  const localityError = submitted && !localityId ? REQUIRED_MSG : null;
  const birthDateError =
    submitted && !birthDate
      ? REQUIRED_MSG
      : (submitted || birthDateTouched) && birthDate && !isoBirthDate
        ? 'Escribe una fecha válida en formato dd/mm/aaaa.'
        : (submitted || birthDateTouched) && isoBirthDate && !isAdultBirthDate(isoBirthDate)
          ? 'Debes ser mayor de edad para registrarte.'
          : null;
  const emailError =
    submitted && !email.trim()
      ? REQUIRED_MSG
      : emailInvalid
        ? 'Este correo no es válido. Revisa que tenga el formato nombre@correo.com'
        : null;
  const passwordError = !submitted
    ? null
    : !password
      ? REQUIRED_MSG
      : !validatePassword(password)
        ? 'Tu contraseña aún no cumple todos los requisitos.'
        : null;
  const phoneErrors = phones.map((p, idx) => {
    if (!submitted) return null;
    const num = p.number.trim();
    if (!num) return REQUIRED_MSG;
    if (!PHONE_REGEX.test(num)) return 'Debe tener 10 dígitos y empezar por 3.';
    // Repetido: se marca a partir de la segunda vez que aparece
    if (phones.slice(0, idx).some((prev) => prev.number.trim() === num)) {
      return 'Este número ya lo agregaste.';
    }
    return null;
  });
  const missingRules = PASSWORD_RULES.filter((rule) => !rule.validate(password));

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      setError('Formato de imagen no válido. Usa JPG, PNG o WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('La imagen supera el tamaño máximo permitido de 5 MB.');
      e.target.value = '';
      return;
    }
    setError('');
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Quita la foto elegida y vuelve al avatar con iniciales
  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejo de teléfonos dinámicos
  const handlePhoneChange = (index, rawValue) => {
    // Solo dígitos y máximo 10
    const cleanDigits = rawValue.replace(/\D/g, '').slice(0, 10);
    setPhones((prev) =>
      prev.map((item, i) => (i === index ? { ...item, number: cleanDigits } : item))
    );
  };

  const handleSetPrincipal = (index) => {
    setPhones((prev) =>
      prev.map((item, i) => ({ ...item, principal: i === index }))
    );
  };

  const handleAddPhone = () => {
    if (phones.length >= 3) return;
    setPhones((prev) => [...prev, { number: '', principal: false }]);
  };

  const handleRemovePhone = (index) => {
    if (phones.length <= 1) return;
    setPhones((prev) => {
      const removed = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      // Si se elimina la fila principal, marcar la primera restante como principal
      if (removed.principal && remaining.length > 0) {
        remaining[0] = { ...remaining[0], principal: true };
      }
      return remaining;
    });
  };

  // Validaciones antes de enviar
  const validateForm = () => {
    if (!name.trim()) {
      return 'El nombre completo es obligatorio.';
    }
    if (!birthDate) {
      return 'La fecha de nacimiento es obligatoria.';
    }
    if (!isoBirthDate) {
      return 'Escribe una fecha válida en formato dd/mm/aaaa.';
    }
    if (!isAdultBirthDate(isoBirthDate)) {
      return 'Debes ser mayor de edad para registrarte.';
    }
    if (!localityId) {
      return 'La localidad es obligatoria.';
    }
    if (!email.trim()) {
      return 'El correo electrónico es obligatorio.';
    }
    if (!validateEmail(email)) {
      return 'Ingresa un correo electrónico válido (ej. tu@correo.com).';
    }

    // Validar teléfonos
    if (phones.length < 1 || phones.length > 3) {
      return 'Debes registrar entre 1 y 3 números de teléfono.';
    }
    const numbers = phones.map((p) => p.number.trim());
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      if (!num) {
        return `El teléfono #${i + 1} no puede estar vacío.`;
      }
      if (!PHONE_REGEX.test(num)) {
        return `El teléfono #${i + 1} (${num}) no es válido. Debe tener 10 dígitos y empezar por 3 (ej. 3001234567).`;
      }
    }
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      return 'No puedes ingresar números de teléfono repetidos.';
    }
    const principalCount = phones.filter((p) => p.principal).length;
    if (principalCount !== 1) {
      return 'Exactamente un teléfono debe estar marcado como principal.';
    }

    // Validar contraseña
    if (!validatePassword(password)) {
      return 'La contraseña no cumple con todas las reglas de seguridad.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    setBirthDateTouched(true);
    setSubmitted(true);
    const validationError = validateForm();
    if (validationError) {
      // Sin mensaje abajo: los campos con problema ya se resaltan en rojo
      setError('');
      // Llevar al usuario al primer campo obligatorio que falta o es inválido
      // (setTimeout espera a que React pinte los campos marcados)
      setTimeout(() => {
        document.querySelector('form [aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    setError('');

    if (email.trim().toLowerCase().endsWith('@oficioya.com') || email.trim().toLowerCase().endsWith('@oficioya')) {
      setError('Por favor usa un correo real (@gmail.com, @outlook.com, institucional, etc.). El dominio @oficioya.com no puede recibir notificaciones.');
      return;
    }

    setLoading(true);

    try {
      await sendRegisterOtp({ email: email.trim() });
      setStep('OTP');
      setResendCooldown(60);
      setOtpCode('');
      setOtpError('');
    } catch (err) {
      if (err.status === 409) {
        setError('Ese correo ya está registrado.');
      } else if (err.status === 429) {
        setError('Has solicitado códigos recientemente. Por favor espera un momento antes de volver a intentar.');
      } else {
        setError(err.message || 'No se pudo enviar el código de verificación al correo. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || otpLoading) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      await sendRegisterOtp({ email: email.trim() });
      setResendCooldown(60);
    } catch (err) {
      if (err.status === 429) {
        setOtpError('Espera unos segundos antes de pedir otro código.');
      } else {
        setOtpError(err.message || 'No se pudo reenviar el código. Intenta de nuevo.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Ingresa el código completo de 6 dígitos.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    const chosenRole =
      ROLE_OPTIONS.find((r) => r.id === selectedRoleId) || ROLE_OPTIONS[0];

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      birthDate: isoBirthDate,
      localityId: Number(localityId),
      phones: phones.map((p) => ({
        number: p.number.trim(),
        principal: Boolean(p.principal),
      })),
      roles: chosenRole.roles,
      code: otpCode.trim(),
    };

    try {
      const createdUser = await register(payload);

      // Auto-login inmediato tras registro exitoso
      try {
        const authData = await login({
          email: payload.email,
          password: payload.password,
        });

        if (authData?.token) {
          const rolesArray = Array.isArray(authData.roles)
            ? authData.roles
            : Array.from(authData.roles ?? []);

          saveSession({
            token: authData.token,
            userId: authData.userId,
            roles: rolesArray,
            expiresInSeconds: authData.expiresInSeconds,
          });
          recordActivity();

          const userName = createdUser?.name || payload.name;
          if (userName) {
            localStorage.setItem('oy_userName', userName);
            window.dispatchEvent(new Event('oy-profile-updated'));
          }

          if (photoFile) {
            try {
              const targetUserId = createdUser?.id || authData.userId;
              await uploadImage({
                file: photoFile,
                rootId: targetUserId,
                tipo: 'PROFILE',
                token: authData.token,
              });
            } catch {
              // Si falla la subida opcional de foto, no interrumpimos el registro
            }
          }

          if (rolesArray.includes('TRABAJADOR')) {
            navigate('/worker/create');
          } else {
            navigate('/home');
          }
          return;
        }
      } catch {
        // Si el auto-login falla por algún motivo de red, fallback a pantalla de login
      }

      // Éxito con fallback: redirigir a /auth?registered=1 si no se completó el auto-login
      navigate('/auth?registered=1');
    } catch (err) {
      if (err.status === 400) {
        setOtpError(err.message || 'Código de verificación incorrecto o expirado.');
      } else if (err.status === 409) {
        setOtpError('Ese correo ya fue registrado por otro usuario.');
      } else {
        setOtpError(err.message || 'Error al completar el registro. Intenta de nuevo.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Iniciales para el avatar mock
  const initials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : 'TU';

  return (
    <div className={styles.page}>
      {step === 'OTP' ? (
        <div className={styles.otpWrapper}>
          <div className={`${styles.card} ${styles.otpCard}`}>
            <div className={styles.iconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <span className={styles.eyebrow}>PASO FINAL</span>
            <h2 className={styles.cardTitle}>Verifica tu correo electrónico</h2>
            <p className={styles.cardSubtitle}>
              Hemos enviado un código de seguridad de 6 dígitos a{' '}
              <strong className={styles.otpEmailText}>{email.trim()}</strong>.
              Ingrésalo para activar tu cuenta.
            </p>

            <form onSubmit={handleConfirmOtp} noValidate>
              <div className={styles.otpInputGroup}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                    if (otpError) setOtpError('');
                  }}
                  className={`${styles.input} ${styles.otpInput} ${otpError ? styles.inputError : ''}`}
                  autoFocus
                />
              </div>

              {otpError && (
                <div className={styles.errorBanner} role="alert" style={{ marginBottom: 16 }}>
                  <span className={styles.errorIcon}>!</span>
                  <span>{otpError}</span>
                </div>
              )}

              <div className={styles.otpActions}>
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className={styles.btnSubmit}
                >
                  {otpLoading ? 'Verificando y activando…' : 'Confirmar y activar cuenta'}
                </button>

                <div className={styles.otpSubActions}>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={otpLoading || resendCooldown > 0}
                    className={styles.otpSecondaryBtn}
                  >
                    {resendCooldown > 0
                      ? `Reenviar código (${resendCooldown}s)`
                      : 'Reenviar código'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('FORM');
                      setOtpError('');
                      setOtpCode('');
                    }}
                    className={styles.otpSecondaryBtn}
                  >
                    Cambiar correo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>CREA TU CUENTA</span>
          <h1 className={styles.heroTitle}>
            Elige cómo usar <span className={styles.brandHighlight}>OficioYa</span>
          </h1>
          <p className={styles.heroSub}>
            Completa tus datos en pocos minutos. Sin vueltas, como debe ser.
          </p>
        </div>

        <aside>
          <div className={`${styles.card} ${styles.roleCardBox}`}>
            <div className={styles.cardHeader}>
              <div className={styles.stepBadge}>1</div>
              <div className={styles.cardHeaderInfo}>
                <h2 className={styles.cardTitle}>¿Cómo quieres usar tu cuenta?</h2>
                <p className={styles.cardSubtitle}>
                  No te preocupes, puedes cambiarlo más adelante desde tu cuenta.
                </p>
              </div>
            </div>

            {/* Selector de Rol (3 tarjetas) */}
            <div className={styles.roleGrid} role="radiogroup" aria-label="¿Cómo quieres usar tu cuenta?">
              {ROLE_OPTIONS.map((opt) => {
                const isActive = selectedRoleId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.roleCard} ${isActive ? styles.roleCardActive : ''}`}
                    onClick={() => setSelectedRoleId(opt.id)}
                    role="radio"
                    aria-checked={isActive}
                  >
                    <div className={styles.roleIconWrap}>{opt.icon}</div>
                    <div className={styles.roleCardTitle}>{opt.title}</div>
                    <div className={styles.roleCardDesc}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className={styles.card}>
          {/* Sección: Información de la cuenta (correo izquierda, contraseña derecha) */}
          <div className={styles.sectionHeader}>
            <div className={styles.stepBadge}>2</div>
            <div className={styles.cardHeaderInfo}>
              <h3 className={styles.sectionTitle}>Información de la cuenta</h3>
              <p className={styles.cardSubtitle}>
                Con tu correo y contraseña iniciarás sesión en OficioYa. No podrás cambiarlos después.
              </p>
            </div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                <span>
                  Correo electrónico <span className={styles.required}>*</span>
                </span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                autoComplete="email"
                className={emailError ? styles.inputInvalid : undefined}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                required
              />
              {emailError && (
                <span id="email-error" className={styles.fieldError} role="alert">
                  {emailError}
                </span>
              )}
            </div>

            <div className={`${styles.formGroup} ${styles.passwordGroup}`}>
              <label className={styles.label} htmlFor="password">
                <span>
                  Crea una contraseña <span className={styles.required}>*</span>
                </span>
              </label>
              <div
                className={styles.passWrap}
                onFocus={() => setPasswordFocused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setPasswordFocused(false);
                  }
                }}
              >
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={passwordError ? styles.inputInvalid : undefined}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
                {/* Requisitos pendientes: globo a un lado, solo lo que falta y solo mientras se escribe */}
                {passwordFocused && missingRules.length > 0 && (
                  <div className={styles.passHint} role="status" aria-live="polite">
                    <div className={styles.passHintTitle}>Tu contraseña debe tener:</div>
                    <ul className={styles.passHintList}>
                      {missingRules.map((rule) => (
                        <li key={rule.id}>{rule.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {passwordError && (
                <span id="password-error" className={styles.fieldError}>
                  {passwordError}
                </span>
              )}
            </div>
          </div>

          {/* Sección: Datos principales (nombre; fecha de nacimiento y localidad; teléfonos) */}
          <div className={`${styles.sectionHeader} ${styles.sectionHeaderDivided}`}>
            <div className={styles.stepBadge}>3</div>
            <h3 className={styles.sectionTitle}>Datos principales</h3>
          </div>
          <div className={styles.gridTwo}>
            <div className={`${styles.formGroup} ${styles.spanAll}`}>
              <label className={styles.label} htmlFor="name">
                <span>
                  Nombre completo <span className={styles.required}>*</span>
                </span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={nameError ? styles.inputInvalid : undefined}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'name-error' : undefined}
                required
              />
              {nameError && (
                <span id="name-error" className={styles.fieldError}>
                  {nameError}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="birthDate">
                <span>
                  Fecha de nacimiento <span className={styles.required}>*</span>
                </span>
              </label>
              {/* Se puede escribir dd/mm/aaaa o elegirla en el calendario del navegador */}
              <div className={styles.dateWrap}>
                <input
                  id="birthDate"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  value={birthDate}
                  onChange={(e) => setBirthDate(formatBirthDateInput(e.target.value))}
                  onBlur={() => setBirthDateTouched(true)}
                  autoComplete="bday"
                  className={birthDateError ? styles.inputInvalid : undefined}
                  aria-invalid={Boolean(birthDateError)}
                  aria-describedby={birthDateError ? 'birthdate-error' : undefined}
                  required
                />
                <button
                  type="button"
                  className={styles.calendarBtn}
                  onClick={() => birthDatePickerRef.current?.showPicker()}
                  aria-label="Abrir calendario"
                  title="Abrir calendario"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                </button>
                <input
                  ref={birthDatePickerRef}
                  type="date"
                  className={styles.datePicker}
                  max={getMaxAdultBirthDate()}
                  value={isoBirthDate ?? ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setBirthDate(fromIsoDate(e.target.value));
                      setBirthDateTouched(true);
                    }
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              {birthDateError && (
                <span id="birthdate-error" className={styles.fieldError} role="alert">
                  {birthDateError}
                </span>
              )}
            </div>

            {/* RF-14. Localidad obligatoria; se puede cambiar después en Editar perfil */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="localityId">
                <span>
                  Tu localidad <span className={styles.required}>*</span>
                </span>
              </label>
              <select
                id="localityId"
                className={`${styles.select} ${localityError ? styles.inputInvalid : ''}`}
                value={localityId}
                onChange={(e) => setLocalityId(e.target.value)}
                aria-invalid={Boolean(localityError)}
                aria-describedby={localityError ? 'locality-error' : undefined}
                required
              >
                <option value="" disabled>Selecciona una localidad</option>
                {localidades.map((localidad) => (
                  <option key={localidad.id} value={localidad.id}>{localidad.name}</option>
                ))}
              </select>
              {localityError && (
                <span id="locality-error" className={styles.fieldError} role="alert">
                  {localityError}
                </span>
              )}
            </div>

            {/* Los teléfonos ocupan todo el ancho, debajo de fecha de nacimiento y localidad */}
            <div className={`${styles.phoneBlock} ${styles.phoneFixed} ${styles.spanAll}`}>
              <div className={styles.phoneSection}>
                <div className={styles.phoneHeader}>
                  <span className={styles.label}>
                    <span>
                      Teléfonos de contacto <span className={styles.required}>*</span>
                    </span>
                  </span>
                  <div className={styles.phoneMeta}>
                    <span>Puedes agregar hasta 3 teléfonos.</span>
                    {phones.length < 3 && (
                      <button
                        type="button"
                        className={styles.addPhoneBtn}
                        onClick={handleAddPhone}
                      >
                        + Agregar otro teléfono
                      </button>
                    )}
                  </div>
                </div>

                {phones.map((phone, idx) => (
                  <div key={idx} className={styles.phoneItem}>
                  <div className={styles.phoneRow}>
                    <div className={styles.phoneInputWrap}>
                      <input
                        type="tel"
                        placeholder="Número de teléfono"
                        value={phone.number}
                        onChange={(e) => handlePhoneChange(idx, e.target.value)}
                        maxLength={10}
                        aria-label={`Número de teléfono ${idx + 1}`}
                        className={phoneErrors[idx] ? styles.inputInvalid : undefined}
                        aria-invalid={Boolean(phoneErrors[idx])}
                        aria-describedby={phoneErrors[idx] ? `phone-error-${idx}` : undefined}
                        required
                      />
                    </div>

                    <label
                      className={`${styles.phonePrincipalLabel} ${phones.length === 1 ? styles.phoneControlDisabled : ''}`}
                      title="Marcar como teléfono principal"
                    >
                      <input
                        type="radio"
                        name="principalPhone"
                        checked={phone.principal}
                        onChange={() => handleSetPrincipal(idx)}
                        disabled={phones.length === 1}
                        className={styles.phoneRadio}
                      />
                      <span>Principal</span>
                    </label>

                    {/* Con un solo teléfono "Principal" y quitar se ven deshabilitados: ya es el principal y no se puede quitar */}
                    <button
                      type="button"
                      className={styles.removePhoneBtn}
                      onClick={() => handleRemovePhone(idx)}
                      disabled={phones.length === 1}
                      aria-label={`Eliminar teléfono ${idx + 1}`}
                      title="Eliminar teléfono"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  {phoneErrors[idx] && (
                    <span id={`phone-error-${idx}`} className={`${styles.fieldError} ${styles.phoneError}`}>
                      {phoneErrors[idx]}
                    </span>
                  )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sección: Datos adicionales (foto de perfil, opcional) */}
          <div className={`${styles.sectionHeader} ${styles.sectionHeaderDivided}`}>
            <div className={styles.stepBadge}>4</div>
            <h3 className={styles.sectionTitle}>Datos adicionales</h3>
          </div>
          {/* Foto de perfil (opcional, conectada a image-service) */}
          <div>
            <span className={`${styles.label} ${styles.photoLabel}`}>Foto de perfil</span>
            <div className={styles.photoBox}>
              <div className={styles.avatarMock}>
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Vista previa de perfil"
                    className={styles.avatarPreviewImg}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className={styles.photoInfo}>
                <div className={styles.photoTitle}>Agrega una foto clara y reciente</div>
                <div className={styles.photoDesc}>
                  {photoFile
                    ? `Archivo seleccionado: ${photoFile.name}`
                    : 'Es opcional. Si no subes una, te asignamos un avatar con tus iniciales. JPG, PNG o WebP, máximo 5 MB.'}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.btnPhotoUpload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {photoFile ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  {photoFile && (
                    <button
                      type="button"
                      className={styles.btnPhotoRemove}
                      onClick={handleRemovePhoto}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                      Borrar foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorIcon}>!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className={styles.actionsFooter}>
            <Link to="/auth" className={styles.linkBack}>
              Volver
            </Link>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading ? 'Enviando código…' : 'Crear mi cuenta'}
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}