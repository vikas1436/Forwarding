
import { useEffect, useRef, useState } from "react";
import "./App.css";

const USERS_KEY = "elogisol_users";
const SESSION_KEY = "elogisol_session";
const COMPANY_KEY = "elogisol_company_details";
const CUSTOMER_KEY = "elogisol_customer_details";

const emptyCompany = {
  companyName: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  gstin: "",
  logo: "",
};

const emptyCustomer = {
  customerId: "",
  iecCode: "",
  address: "",
  emailId: "",
  icegateId: "",
  aadhaarNumber: "",
  gstin: "",
};

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export default function App() {
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  // Form values: blank after login/refresh and after successful save
  const [company, setCompany] = useState({ ...emptyCompany });
  const [customer, setCustomer] = useState({ ...emptyCustomer });

  // Saved company details are kept separately for the sidebar
  const [savedCompany, setSavedCompany] = useState({ ...emptyCompany });

  const [gstFile, setGstFile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const logoInputRef = useRef(null);
  const gstInputRef = useRef(null);

  function getUsers() {
    return readStorage(USERS_KEY, []);
  }

  function getRecords(key) {
    return readStorage(key, {});
  }

  function notify(text, type = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  function loadUserData(user) {
    const companies = getRecords(COMPANY_KEY);
    const customers = getRecords(CUSTOMER_KEY);

    // Load saved company name and logo for the sidebar only.
    // Keep all form fields blank after login or refresh.
    const saved = companies[user.email] || {};

    setSavedCompany({
      ...emptyCompany,
      ...saved,
    });

    setCompany({ ...emptyCompany });
    setCustomer({ ...emptyCustomer });
    setGstFile(null);

    if (logoInputRef.current) logoInputRef.current.value = "";
    if (gstInputRef.current) gstInputRef.current.value = "";

    clearMessage();
  }

  useEffect(() => {
    const session = readStorage(SESSION_KEY, null);
    if (!session?.email) return;

    const user = getUsers().find((item) => item.email === session.email);

    if (user) {
      setCurrentUser(user);
      loadUserData(user);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    clearMessage();
  }

  function handleRegister(event) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

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

    try {
      users.push({ email: cleanEmail, password });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

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
      (item) => item.email === cleanEmail && item.password === password
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

      setCurrentUser(user);
      loadUserData(user);
      setPassword("");
    } catch {
      notify("Unable to log in. Please try again.");
    }
  }

  function handleCompanyChange(event) {
    const { name, value } = event.target;
    setCompany((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;
    setCustomer((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      notify("Logo must be a PNG, JPG, JPEG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify("Please select a logo smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCompany((previous) => ({
        ...previous,
        logo: String(reader.result),
      }));
      clearMessage();
    };

    reader.onerror = () => notify("Unable to read the logo file.");
    reader.readAsDataURL(file);
  }

  function handleCombinedSubmit(event) {
    event.preventDefault();

    if (!currentUser) return;

    // Company validation
    if (!company.companyName.trim()) {
      notify("Please enter your company name.");
      return;
    }

    if (!company.email.trim()) {
      notify("Please enter your company email.");
      return;
    }

    if (!company.address.trim()) {
      notify("Please enter your registered address.");
      return;
    }

    const finalLogo = company.logo || savedCompany.logo;

    if (!finalLogo) {
      notify("Please upload your company logo.");
      return;
    }

    // Customer / Import-Export validation
    if (!customer.customerId.trim()) {
      notify("Please enter Customer ID.");
      return;
    }

    if (!customer.iecCode.trim()) {
      notify("Please enter IEC Code.");
      return;
    }

    if (!customer.emailId.trim()) {
      notify("Please enter Customer Email ID.");
      return;
    }

    if (!customer.icegateId.trim()) {
      notify("Please enter ICEGATE ID.");
      return;
    }

    if (!/^[0-9]{12}$/.test(customer.aadhaarNumber)) {
      notify("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (!customer.gstin.trim()) {
      notify("Please enter Customer GSTIN.");
      return;
    }

    if (!customer.address.trim()) {
      notify("Please enter Customer Address.");
      return;
    }

    if (
      gstFile &&
      !["application/pdf", "image/jpeg", "image/png"].includes(gstFile.type)
    ) {
      notify("Please upload a PDF, JPG, JPEG, or PNG GST document.");
      return;
    }

    try {
      const companyRecords = getRecords(COMPANY_KEY);
      const customerRecords = getRecords(CUSTOMER_KEY);

      const companyData = {
        ...company,
        logo: finalLogo,
        companyName: company.companyName.trim(),
        email: company.email.trim(),
        phone: company.phone.trim(),
        address: company.address.trim(),
        website: company.website.trim(),
        gstin: company.gstin.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Aadhaar is deliberately not stored in LocalStorage.
      const { aadhaarNumber, ...safeCustomerData } = customer;

      const customerData = {
        ...safeCustomerData,
        customerId: customer.customerId.trim(),
        iecCode: customer.iecCode.trim(),
        address: customer.address.trim(),
        emailId: customer.emailId.trim(),
        icegateId: customer.icegateId.trim(),
        gstin: customer.gstin.trim(),
        gstFileName: gstFile?.name || "",
        updatedAt: new Date().toISOString(),
      };

      companyRecords[currentUser.email] = companyData;
      customerRecords[currentUser.email] = customerData;

      // Save both sections together
      localStorage.setItem(COMPANY_KEY, JSON.stringify(companyRecords));
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customerRecords));

      // Keep saved company logo and name visible in sidebar
      setSavedCompany(companyData);

      // Clear all form fields after successful save
      setCompany({ ...emptyCompany });
      setCustomer({ ...emptyCustomer });
      setGstFile(null);

      if (logoInputRef.current) logoInputRef.current.value = "";
      if (gstInputRef.current) gstInputRef.current.value = "";

      clearMessage();
      setShowSuccessPopup(true);
    } catch {
      notify("Unable to save details. Browser storage may be full.");
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);

    setCurrentUser(null);
    setCompany({ ...emptyCompany });
    setCustomer({ ...emptyCustomer });
    setSavedCompany({ ...emptyCompany });
    setGstFile(null);

    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowSuccessPopup(false);
    setMode("login");

    clearMessage();
  }

  if (!currentUser) {
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
              {mode === "register" ? "Create your account" : "Log in"}
            </h1>
            <p className="form-description">
              {mode === "register"
                ? "Register with your email and password."
                : "Log in to manage your company details."}
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
                  <small className="field-hint">
                    Minimum 8 characters
                  </small>
                )}
              </label>

              <div className="input-area password-area">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                />

                <button
                  type="button"
                  className="show-btn"
                  onClick={() => setShowPassword((value) => !value)}
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
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Re-enter password"
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

            <button className="submit-btn auth-submit" type="submit">
              {mode === "register" ? "Create Account →" : "Log in →"}
            </button>
          </form>

          <p className="switch-text">
            {mode === "register" ? "Already registered? " : "New to Elogisol? "}
            <button
              type="button"
              onClick={() =>
                changeMode(mode === "register" ? "login" : "register")
              }
            >
              {mode === "register" ? "Log in" : "Create account"}
            </button>
          </p>

          <footer className="form-footer">
            © 2026 Elogisol Technologies
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {savedCompany.logo ? (
            <img
              className="sidebar-logo"
              src={savedCompany.logo}
              alt="Company logo"
            />
          ) : (
            <div className="sidebar-logo-placeholder">E</div>
          )}

          <div className="sidebar-brand-text">
            <strong>
              {savedCompany.companyName || "Elogisol Portal"}
            </strong>
            <small>Company Workspace</small>
          </div>
        </div>

        <p className="sidebar-section-label">MASTER MENU</p>

        <button type="button" className="sidebar-link selected">
          <span>▦</span> Company Details
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {currentUser.email[0].toUpperCase()}
            </div>

            <div className="sidebar-user-text">
              <strong>Logged in</strong>
              <small>{currentUser.email}</small>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            ↪ Log out
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-topbar">
          <div>
            <p className="topbar-eyebrow">ELOGISOL TECHNOLOGIES</p>
            <h2>
              {savedCompany.companyName || "Company Workspace"}
            </h2>
          </div>

          <span className="account-badge">● Logged in</span>
        </header>

        <div className="workspace-content">
          <div className="page-heading">
            <p className="eyebrow">MASTER PAGE</p>
            <h1>Company Details</h1>
            <p>
              Enter your company and customer/import-export information
              below.
            </p>
          </div>

          <form className="details-card" onSubmit={handleCombinedSubmit}>
            {/* COMPANY INFORMATION */}
            <div className="company-section-heading">
  <h3>Company Information</h3>
  <p>Enter your company details and upload its logo.</p>
</div>

<div className="required-note company-required-note">
  * Required
</div>

            <div className="company-logo-row">
              <div className="logo-preview">
                {company.logo || savedCompany.logo ? (
                  <img
                    src={company.logo || savedCompany.logo}
                    alt="Company logo preview"
                  />
                ) : (
                  <span>Logo</span>
                )}
              </div>

              <div className="logo-upload">
                <label htmlFor="companyLogo">Company Logo *</label>
                <input
                  ref={logoInputRef}
                  id="companyLogo"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleLogoChange}
                />
                <small>
                  PNG, JPG, JPEG or WEBP. Maximum size: 2 MB.
                </small>
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-field">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  id="companyName"
                  name="companyName"
                  value={company.companyName}
                  onChange={handleCompanyChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="companyEmail">Company Email *</label>
                <input
                  id="companyEmail"
                  name="email"
                  type="email"
                  value={company.email}
                  onChange={handleCompanyChange}
                  placeholder="company@example.com"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="companyPhone">Contact Number</label>
                <input
                  id="companyPhone"
                  name="phone"
                  type="tel"
                  value={company.phone}
                  onChange={handleCompanyChange}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="detail-field">
                <label htmlFor="companyGstin">Company GSTIN</label>
                <input
                  id="companyGstin"
                  name="gstin"
                  maxLength={15}
                  value={company.gstin}
                  onChange={handleCompanyChange}
                  placeholder="Enter GSTIN"
                />
              </div>

              <div className="detail-field full-span">
                <label htmlFor="companyAddress">Registered Address *</label>
                <textarea
                  id="companyAddress"
                  name="address"
                  rows={2}
                  value={company.address}
                  onChange={handleCompanyChange}
                  placeholder="Enter registered company address"
                  required
                />
              </div>

              <div className="detail-field full-span">
                <label htmlFor="companyWebsite">Website</label>
                <input
                  id="companyWebsite"
                  name="website"
                  type="url"
                  value={company.website}
                  onChange={handleCompanyChange}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            {/* CUSTOMER / IMPORT-EXPORT INFORMATION */}
<div className="customer-section-heading">
  <h3>Customer / Import-Export Information</h3>
  <p>Enter customer and import-export details.</p>
</div>

            <div className="details-grid">
              <div className="detail-field">
                <label htmlFor="customerId">Customer ID *</label>
                <input
                  id="customerId"
                  name="customerId"
                  value={customer.customerId}
                  onChange={handleCustomerChange}
                  placeholder="Enter customer ID"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="iecCode">IEC Code *</label>
                <input
                  id="iecCode"
                  name="iecCode"
                  value={customer.iecCode}
                  onChange={handleCustomerChange}
                  placeholder="Enter IEC code"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="emailId">Customer Email ID *</label>
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

              <div className="detail-field">
                <label htmlFor="icegateId">ICE GATE ID *</label>
                <input
                  id="icegateId"
                  name="icegateId"
                  value={customer.icegateId}
                  onChange={handleCustomerChange}
                  placeholder="Enter ICEGATE ID"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="aadhaarNumber">Aadhaar Number *</label>
                <input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  type="password"
                  inputMode="numeric"
                  maxLength={12}
                  pattern="[0-9]{12}"
                  autoComplete="off"
                  value={customer.aadhaarNumber}
                  onChange={handleCustomerChange}
                  placeholder="12-digit Aadhaar"
                  required
                />
              </div>

              <div className="detail-field">
                <label htmlFor="customerGstin">Customer GSTIN *</label>
                <input
                  id="customerGstin"
                  name="gstin"
                  maxLength={15}
                  value={customer.gstin}
                  onChange={handleCustomerChange}
                  placeholder="Enter GSTIN"
                  required
                />
              </div>

              <div className="detail-field full-span">
                <label htmlFor="customerAddress">Customer Address *</label>
                <textarea
                  id="customerAddress"
                  name="address"
                  rows={2}
                  value={customer.address}
                  onChange={handleCustomerChange}
                  placeholder="Enter complete customer address"
                  required
                />
              </div>

              <div className="detail-field full-span">
                <label htmlFor="gstUpload">Upload GST Document</label>
                <input
                  ref={gstInputRef}
                  id="gstUpload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) =>
                    setGstFile(event.target.files?.[0] || null)
                  }
                />
                <small>
                  PDF, JPG, JPEG or PNG.
                  {gstFile ? ` Selected: ${gstFile.name}` : ""}
                </small>
              </div>
            </div>

            {message && (
              <div className={`message ${messageType}`} role="alert">
                {message}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                Save Company Details
              </button>
            </div>
          </form>

          <footer className="dashboard-footer">
            © 2026 Elogisol Technologies
          </footer>
        </div>
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
              Company and Customer details saved successfully.
              All form fields have been cleared.
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
