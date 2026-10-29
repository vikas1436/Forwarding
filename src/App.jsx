
import { useEffect, useRef, useState } from "react";
import "./App.css";

const USERS_KEY = "elogisol_users";
const SESSION_KEY = "elogisol_session";
const CUSTOMER_KEY = "elogisol_customer_details";

const emptyCustomer = {
  customerId: "",
  iecCode: "",
  address: "",
  emailId: "",
  icegateId: "",
  aadhaarNumber: "",
  gstin: "",
};

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function getCustomerRecords() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function App() {
  const [mode, setMode] = useState("register");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [customer, setCustomer] = useState({ ...emptyCustomer });
  const [gstFile, setGstFile] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const session = JSON.parse(
        localStorage.getItem(SESSION_KEY) || "null"
      );

      if (!session?.email) return;

      const user = getUsers().find(
        (item) => item.email === session.email
      );

      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      setCurrentUser(user);

      const records = getCustomerRecords();
      const savedCustomer = records[user.email];

      if (savedCustomer) {
        setCustomer({
          ...emptyCustomer,
          ...savedCustomer,
          aadhaarNumber: "",
        });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  function notify(text, type = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  function handleRegister(event) {
    event.preventDefault();

    const name = companyName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!name || !cleanEmail || !password || !confirmPassword) {
      notify("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      notify("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      notify("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      notify("Passwords do not match.");
      return;
    }

    const users = getUsers();

    if (users.some((user) => user.email === cleanEmail)) {
      notify("Email already registered. Please log in.");
      return;
    }

    users.push({
      companyName: name,
      email: cleanEmail,
      password,
    });

    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      setCompanyName("");
      setEmail(cleanEmail);
      setPassword("");
      setConfirmPassword("");
      setMode("login");

      notify("Registration successful. Please log in.", "success");
    } catch {
      notify("Unable to register. Please try again.");
    }
  }

  function handleLogin(event) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    const user = getUsers().find(
      (item) =>
        item.email === cleanEmail &&
        item.password === password
    );

    if (!user) {
      notify("Invalid email or password.");
      return;
    }

    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ email: user.email })
      );

      const savedCustomer = getCustomerRecords()[user.email];

      setCustomer({
        ...emptyCustomer,
        ...(savedCustomer || {}),
        aadhaarNumber: "",
      });

      setGstFile(null);
      setCurrentUser(user);
      setPassword("");
      setMessage("");
    } catch {
      notify("Unable to log in. Please try again.");
    }
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;

    setCustomer((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCustomerSubmit(event) {
    event.preventDefault();

    if (!currentUser) return;

    if (!gstFile) {
      notify("Please select a GST document before saving.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(gstFile.type)) {
      notify("Please upload a PDF, JPG, JPEG, or PNG file.");
      return;
    }

    try {
      const records = getCustomerRecords();

      // Aadhaar is intentionally excluded from browser storage.
      const {
        aadhaarNumber,
        ...safeCustomerDetails
      } = customer;

      records[currentUser.email] = {
        ...safeCustomerDetails,
        gstFileName: gstFile.name,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(records));

      // Clear all form fields and the selected file.
      setCustomer({ ...emptyCustomer });
      setGstFile(null);
      setMessage("");
      setMessageType("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Open the success popup.
      setShowSuccessPopup(true);
    } catch {
      notify(
        "Unable to save details. Browser storage may be full.",
        "error"
      );
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);

    setCurrentUser(null);
    setCustomer({ ...emptyCustomer });
    setGstFile(null);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setShowSuccessPopup(false);
    setMode("login");
  }

  if (currentUser) {
    return (
      <main className="dashboard-page">
        <header className="dashboard-nav">
          <div className="company-title">
            <span className="nav-logo">E</span>
            Elogisol Technologies
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
          >
            Log out
          </button>
        </header>

        <section className="customer-container">
          <div className="customer-heading">
            <span className="account-badge">Logged in</span>

            <div className="customer-heading-text">
              <p className="welcome-label">CUSTOMER WORKSPACE</p>
              <h1>Customer Details</h1>
              <p className="dashboard-description">
                Enter your company and import-export details below.
              </p>
            </div>
          </div>

          <form
            className="customer-form"
            onSubmit={handleCustomerSubmit}
          >
            <div className="customer-field">
              <label htmlFor="customerId">Customer ID</label>
              <input
                id="customerId"
                name="customerId"
                value={customer.customerId}
                onChange={handleCustomerChange}
                placeholder="Enter customer ID"
                required
              />
            </div>

            <div className="customer-field">
              <label htmlFor="iecCode">IEC Code</label>
              <input
                id="iecCode"
                name="iecCode"
                value={customer.iecCode}
                onChange={handleCustomerChange}
                placeholder="Enter IEC code"
                required
              />
            </div>

            <div className="customer-field full-width">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={customer.address}
                onChange={handleCustomerChange}
                placeholder="Enter complete address"
                rows={2}
                required
              />
            </div>

            <div className="customer-field">
              <label htmlFor="emailId">Email ID</label>
              <input
                id="emailId"
                name="emailId"
                type="email"
                value={customer.emailId}
                onChange={handleCustomerChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="customer-field">
              <label htmlFor="icegateId">ICEGATE ID</label>
              <input
                id="icegateId"
                name="icegateId"
                value={customer.icegateId}
                onChange={handleCustomerChange}
                placeholder="Enter ICEGATE ID"
                required
              />
            </div>

            <div className="customer-field">
              <label htmlFor="aadhaarNumber">Aadhaar Number</label>
              <input
                id="aadhaarNumber"
                name="aadhaarNumber"
                type="password"
                inputMode="numeric"
                maxLength={12}
                pattern="[0-9]{12}"
                value={customer.aadhaarNumber}
                onChange={handleCustomerChange}
                placeholder="Enter 12-digit Aadhaar"
                autoComplete="off"
                required
              />
            </div>

            <div className="customer-field">
              <label htmlFor="gstin">GSTIN</label>
              <input
                id="gstin"
                name="gstin"
                value={customer.gstin}
                onChange={handleCustomerChange}
                placeholder="Enter GSTIN"
                maxLength={15}
                required
              />
            </div>

            <div className="customer-field full-width">
              <label htmlFor="gstUpload">Upload GST Document</label>
              <input
                ref={fileInputRef}
                id="gstUpload"
                className="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) =>
                  setGstFile(event.target.files?.[0] || null)
                }
                required
              />
              <small>
                Accepted formats: PDF, JPG, JPEG, PNG.
                {gstFile ? ` Selected: ${gstFile.name}` : ""}
              </small>
            </div>

            {message && (
              <div
                className={`message ${messageType} full-width`}
                role="alert"
              >
                {message}
              </div>
            )}

            <div className="customer-actions full-width">
              <button
                className="submit-btn customer-submit"
                type="submit"
              >
                Save Customer Details
              </button>
            </div>
          </form>

          <p className="dashboard-footer">
            © 2026 Elogisol Technologies
          </p>
        </section>

        {showSuccessPopup && (
          <div
            className="success-overlay"
            onClick={() => setShowSuccessPopup(false)}
          >
            <div
              className="success-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="success-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="success-icon">✓</div>

              <h2 id="success-title">Success!</h2>

              <p>
                Customer details saved successfully.
              </p>

              <button
                type="button"
                className="success-ok-btn"
                onClick={() => setShowSuccessPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="company-header">
          <div className="company-mark">E</div>

          <div className="company-heading">
            <h2>Elogisol Technologies</h2>
            <p>Company Account Portal</p>
          </div>
        </header>

        <div className="form-heading">
          <p className="eyebrow">
            {mode === "register" ? "CREATE AN ACCOUNT" : "WELCOME BACK"}
          </p>

          <h1>
            {mode === "register"
              ? "Register your company"
              : "Log in to your account"}
          </h1>

          <p className="form-description">
            {mode === "register"
              ? "Enter your details to get your workspace started."
              : "Enter your account details to continue."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => changeMode("login")}
          >
            Log in
          </button>

          <button
            type="button"
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => changeMode("register")}
          >
            Register
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={mode === "register" ? handleRegister : handleLogin}
        >
          {mode === "register" && (
            <div className="field">
              <label htmlFor="companyName">Company Name</label>
              <div className="input-area">
                <input
                  id="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Enter your company name"
                  autoComplete="organization"
                  required
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email Address</label>
            <div className="input-area">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">
              Password
              {mode === "register" && (
                <small className="field-hint">Minimum 8 characters</small>
              )}
            </label>

            <div className="input-area password-area">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "register" ? "Create a password" : "Enter password"
                }
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
              />

              <button
                type="button"
                className="show-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-area">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter password again"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {message && (
            <div className={`message ${messageType}`} role="alert">
              {message}
            </div>
          )}

          <button className="submit-btn" type="submit">
            {mode === "register"
              ? "Create company account →"
              : "Log in →"}
          </button>
        </form>

        <p className="switch-text">
          {mode === "register" ? (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => changeMode("login")}>
                Log in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => changeMode("register")}>
                Register
              </button>
            </>
          )}
        </p>

        <footer className="form-footer">
          © 2026 Elogisol Technologies
        </footer>
      </section>
    </main>
  );
}
