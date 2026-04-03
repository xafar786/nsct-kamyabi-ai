import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const USER_KEY = 'nsct-kamyabi-user'
const TEST_KEY = 'nsct-kamyabi-test'
const RESULT_KEY = 'nsct-kamyabi-result'

const fallbackCriteria = [
  { key: 'networks', label: 'Computer Networks and Cloud Computing', questionCount: 10, weightPercent: 10 },
  { key: 'programming', label: 'Programming (C++/Java/Python)', questionCount: 10, weightPercent: 10 },
  { key: 'dsa', label: 'Data Structures & Algorithms', questionCount: 10, weightPercent: 10 },
  { key: 'os', label: 'Operating Systems', questionCount: 5, weightPercent: 5 },
  { key: 'software_engineering', label: 'Software Engineering', questionCount: 10, weightPercent: 10 },
  { key: 'web_development', label: 'Web Development', questionCount: 10, weightPercent: 10 },
  { key: 'ai_ml', label: 'AI / Machine Learning and Data Analytics', questionCount: 10, weightPercent: 10 },
  { key: 'cyber_security', label: 'Cyber Security', questionCount: 5, weightPercent: 5 },
  { key: 'databases', label: 'Databases', questionCount: 10, weightPercent: 10 },
  { key: 'problem_solving', label: 'Problem Solving And Analytical Skills', questionCount: 20, weightPercent: 20 },
]

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Something went wrong.' }))
    throw new Error(payload.detail || 'Something went wrong.')
  }

  return response.json()
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardShell />}>
            <Route index element={<DashboardHome />} />
            <Route path="test" element={<DashboardTestHub />} />
            <Route path="about" element={<AboutDeveloper />} />
          </Route>
          <Route path="/test" element={<TestPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function HomeRedirect() {
  const user = readStorage(USER_KEY, null)
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

function ProtectedRoute() {
  const user = readStorage(USER_KEY, null)
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AuthPage({ mode }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = await api(isLogin ? '/login' : '/signup', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      writeStorage(USER_KEY, payload.user)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <p className="eyebrow">NSCT Kamyabi AI</p>
          <h1>Demo MCQs platform for focused preparation.</h1>
          <p className="hero-copy">
            Practice a 100-question sample test built from your subject criteria, review explanations,
            and track your performance across the full syllabus.
          </p>
          <div className="hero-stats">
            <div>
              <strong>100</strong>
              <span>Total MCQs per demo test</span>
            </div>
            <div>
              <strong>10</strong>
              <span>Criteria groups covered</span>
            </div>
            <div>
              <strong>Blue</strong>
              <span>Clean focus-first interface</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-tabs">
            <Link className={isLogin ? 'auth-tab active' : 'auth-tab'} to="/login">
              Login
            </Link>
            <Link className={!isLogin ? 'auth-tab active' : 'auth-tab'} to="/signup">
              Sign Up
            </Link>
          </div>

          <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">
            {isLogin
              ? 'Use your CSV-backed account to continue your demo test journey.'
              : 'New students can register here and get added to the users CSV automatically.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="Enter username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Enter password"
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Login to Dashboard' : 'Create Account'}
            </button>
          </form>

          <div className="demo-note">
            <span>Demo Account</span>
            <strong>`demo / demo123`</strong>
          </div>
        </section>
      </div>
    </main>
  )
}

function DashboardShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = readStorage(USER_KEY, null)
  const activeTest = readStorage(TEST_KEY, null)

  function logout() {
    window.localStorage.removeItem(USER_KEY)
    window.localStorage.removeItem(TEST_KEY)
    window.localStorage.removeItem(RESULT_KEY)
    navigate('/login', { replace: true })
  }

  const title = location.pathname.endsWith('/about')
    ? 'About Developer'
    : location.pathname.endsWith('/test')
      ? 'Demo Test Center'
      : 'Dashboard'

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">NSCT Kamyabi AI</p>
          <h2 className="sidebar-title">Student practice portal</h2>
          <p className="sidebar-copy">One place to sign in, attempt a 100 MCQs demo test, and review performance.</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink end to="/dashboard">
            Overview
          </NavLink>
          <NavLink to="/dashboard/test">
            Demo Test
          </NavLink>
          <NavLink to="/dashboard/about">
            About Developer
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p>
            Logged in as <strong>{user?.username}</strong>
          </p>
          <p>{activeTest ? 'A test is currently in progress.' : 'Ready to begin a fresh attempt.'}</p>
          <button className="ghost-button" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-chip">Blue Theme Interface</div>
        </header>

        <Outlet />
      </section>
    </div>
  )
}

function DashboardHome() {
  const [criteria, setCriteria] = useState(fallbackCriteria)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api('/criteria')
      .then((payload) => {
        if (active) {
          setCriteria(payload.criteria)
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="panel-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Preparation Snapshot</p>
          <h2>Practice the exact weighted structure of your demo test.</h2>
          <p className="muted">
            The generator pulls 100 MCQs from your bank using the required subject split so students get a
            realistic practice run every time.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/dashboard/test">
            Open Demo Test
          </Link>
          <Link className="secondary-button" to="/dashboard/about">
            Meet the Developer
          </Link>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card">
          <strong>100</strong>
          <span>Questions per attempt</span>
        </div>
        <div className="metric-card">
          <strong>100 min</strong>
          <span>Suggested timed practice</span>
        </div>
        <div className="metric-card">
          <strong>CSV</strong>
          <span>Auth users stored in CSV</span>
        </div>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h3>Criteria Distribution</h3>
          <span>{loading ? 'Loading live criteria...' : 'Loaded from backend configuration'}</span>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="criteria-grid">
          {criteria.map((item) => (
            <article className="criteria-card" key={item.key}>
              <p>{item.label}</p>
              <strong>{item.questionCount} MCQs</strong>
              <span>{item.weightPercent}% weight</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function DashboardTestHub() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeTest = readStorage(TEST_KEY, null)
  const latestResult = readStorage(RESULT_KEY, null)

  async function startTest() {
    setLoading(true)
    setError('')
    try {
      const payload = await api('/test')
      const session = {
        ...payload,
        startedAt: Date.now(),
        answers: {},
      }
      writeStorage(TEST_KEY, session)
      window.localStorage.removeItem(RESULT_KEY)
      navigate('/test')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel-stack">
      <section className="content-panel test-hub">
        <div>
          <p className="eyebrow">Demo Attempt</p>
          <h2>Launch a new randomized 100 MCQs test.</h2>
          <p className="muted">
            Questions are drawn according to the criteria percentages and shuffled to create a fresh demo
            experience.
          </p>
        </div>

        <div className="hub-actions">
          <button className="primary-button" type="button" onClick={startTest} disabled={loading}>
            {loading ? 'Generating test...' : 'Start New Test'}
          </button>
          {activeTest ? (
            <button className="secondary-button" type="button" onClick={() => navigate('/test')}>
              Continue Current Test
            </button>
          ) : null}
          {latestResult ? (
            <button className="ghost-button" type="button" onClick={() => navigate('/results')}>
              View Last Result
            </button>
          ) : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h3>What students can do</h3>
        </div>

        <div className="feature-list">
          <article>
            <strong>Attempt realistically</strong>
            <p>Practice all major areas from networks to problem solving in a single sitting.</p>
          </article>
          <article>
            <strong>Review instantly</strong>
            <p>See correct answers and explanations right after submission.</p>
          </article>
          <article>
            <strong>Stay organized</strong>
            <p>Resume an in-progress attempt from the same browser session.</p>
          </article>
        </div>
      </section>
    </div>
  )
}

function AboutDeveloper() {
  return (
    <div className="panel-stack">
      <section className="content-panel about-card">
        <p className="eyebrow">Community Gift</p>
        <h2>Zafar Rehman</h2>
        <p className="muted">
          This platform is a community gift for fellow students, prepared with the help of AI to make demo
          practice more accessible and structured.
        </p>

        <div className="about-links">
          <a className="primary-button" href="https://www.linkedin.com/in/zafarrehman/" target="_blank" rel="noreferrer">
            LinkedIn Profile
          </a>
        </div>
      </section>
    </div>
  )
}

function TestPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => readStorage(TEST_KEY, null))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!session) {
      navigate('/dashboard/test', { replace: true })
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [navigate, session])

  useEffect(() => {
    if (!session) {
      return
    }
    writeStorage(TEST_KEY, session)
  }, [session])

  const remainingSeconds = useMemo(() => {
    if (!session) return 0
    const end = session.startedAt + session.durationMinutes * 60 * 1000
    return Math.max(0, Math.floor((end - now) / 1000))
  }, [now, session])

  useEffect(() => {
    if (session && remainingSeconds === 0 && !submitting) {
      handleSubmit()
    }
  }, [remainingSeconds, session, submitting])

  if (!session) {
    return null
  }

  const currentQuestion = session.questions[currentIndex]
  const answeredCount = Object.keys(session.answers || {}).length

  function selectAnswer(choice) {
    setSession((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [currentQuestion.id]: choice,
      },
    }))
  }

  async function handleSubmit() {
    if (!session) return
    setSubmitting(true)
    setError('')

    try {
      const payload = await api('/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: session.questions.map((question) => ({
            questionId: question.id,
            selected: session.answers?.[question.id] || null,
          })),
        }),
      })

      writeStorage(RESULT_KEY, {
        ...payload,
        submittedAt: Date.now(),
      })
      window.localStorage.removeItem(TEST_KEY)
      navigate('/results', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="test-page">
      <header className="test-header">
        <div>
          <p className="eyebrow">Active Attempt</p>
          <h1>{session.title}</h1>
        </div>

        <div className="test-header-actions">
          <div className="timer-card">{formatDuration(remainingSeconds)}</div>
          <button className="ghost-button" type="button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <section className="test-layout">
        <aside className="question-nav">
          <div className="nav-summary">
            <strong>{answeredCount}/100</strong>
            <span>Questions answered</span>
          </div>

          <div className="question-grid">
            {session.questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={[
                  'question-jump',
                  currentIndex === index ? 'current' : '',
                  session.answers?.[question.id] ? 'done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setCurrentIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </aside>

        <article className="question-card">
          <div className="question-meta">
            <span>
              Question {currentIndex + 1} / {session.totalQuestions}
            </span>
            <span>{currentQuestion.categoryLabel}</span>
          </div>
          <h2>{currentQuestion.question}</h2>
          <p className="muted">
            {currentQuestion.subject} {currentQuestion.topic ? ` - ${currentQuestion.topic}` : ''}
          </p>

          <div className="options-list">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <button
                key={key}
                type="button"
                className={session.answers?.[currentQuestion.id] === key ? 'option-button selected' : 'option-button'}
                onClick={() => selectAnswer(key)}
              >
                <strong>{key}</strong>
                <span>{value}</span>
              </button>
            ))}
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="question-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCurrentIndex((index) => Math.min(index + 1, session.questions.length - 1))}
              disabled={currentIndex === session.questions.length - 1}
            >
              Next
            </button>
            <button className="primary-button" type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </article>
      </section>
    </main>
  )
}

function ResultsPage() {
  const navigate = useNavigate()
  const result = readStorage(RESULT_KEY, null)

  if (!result) {
    return <Navigate to="/dashboard/test" replace />
  }

  return (
    <main className="results-page">
      <section className="results-hero">
        <div>
          <p className="eyebrow">Performance Review</p>
          <h1>
            {result.score} / {result.total}
          </h1>
          <p className="muted">You scored {result.percentage}% on this demo attempt.</p>
        </div>

        <div className="results-actions">
          <button className="primary-button" type="button" onClick={() => navigate('/dashboard/test')}>
            Start Another Test
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h3>Category Summary</h3>
        </div>
        <div className="criteria-grid">
          {result.summary.map((item) => (
            <article className="criteria-card" key={item.label}>
              <p>{item.label}</p>
              <strong>
                {item.correct} / {item.total}
              </strong>
              <span>{Math.round((item.correct / item.total) * 100)}% accuracy</span>
            </article>
          ))}
        </div>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h3>Question Review</h3>
          <span>Explanations are included for revision</span>
        </div>

        <div className="review-list">
          {result.results.map((item, index) => (
            <article className={item.isCorrect ? 'review-card correct' : 'review-card incorrect'} key={item.questionId}>
              <div className="review-head">
                <strong>Q{index + 1}</strong>
                <span>{item.subject}</span>
              </div>
              <h4>{item.question}</h4>
              <p>
                Your answer: <strong>{item.selected || 'Not answered'}</strong> | Correct answer:{' '}
                <strong>{item.correctAnswer}</strong>
              </p>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default App
