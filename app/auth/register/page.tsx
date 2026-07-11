'use client'

import { useState } from 'react'
import { ChevronLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type RegistrationStep = 1 | 2 | 3 | 4

interface FormData {
  // Step 1: Personal Information
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  gender: string
  birthDate: string

  // Step 2: Employment Information
  employeeId: string
  position: string
  department: string
  gradeLevel: string
  sections: string[]

  // Step 3: Account Information
  schoolEmail: string
  username: string
  password: string
  confirmPassword: string

  // Step 4: Verification Documents
  idCopy: File | null
  employmentProof: File | null
  certification: boolean
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    gender: '',
    birthDate: '',
    employeeId: '',
    position: '',
    department: '',
    gradeLevel: '',
    sections: [],
    schoolEmail: '',
    username: '',
    password: '',
    confirmPassword: '',
    idCopy: null,
    employmentProof: null,
    certification: false,
  })
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setError('')
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSectionToggle = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter((s) => s !== section)
        : [...prev.sections, section],
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCopy' | 'employmentProof') => {
    if (e.target.files?.[0]) {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.files![0],
      }))
    }
  }

  const validateStep = (): boolean => {
    setError('')
    
    if (currentStep === 1) {
      const missing = []
      if (!formData.firstName) missing.push('First Name')
      if (!formData.lastName) missing.push('Last Name')
      if (!formData.gender) missing.push('Gender')
      if (!formData.birthDate) missing.push('Birth Date')
      
      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`)
        return false
      }
    } else if (currentStep === 2) {
      const missing = []
      if (!formData.employeeId) missing.push('Employee ID')
      if (!formData.position) missing.push('Faculty Position')
      if (!formData.department) missing.push('Department')
      if (!formData.gradeLevel) missing.push('Grade Level')
      
      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`)
        return false
      }
      if (formData.sections.length === 0) {
        setError('Please select at least one section to teach')
        return false
      }
    } else if (currentStep === 3) {
      const missing = []
      if (!formData.schoolEmail) missing.push('School Email')
      if (!formData.username) missing.push('Username')
      if (!formData.password) missing.push('Password')
      if (!formData.confirmPassword) missing.push('Password Confirmation')
      
      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`)
        return false
      }
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.schoolEmail)) {
        setError('Please enter a valid email address')
        return false
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please check and try again.')
        return false
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters for security')
        return false
      }
    } else if (currentStep === 4) {
      if (!formData.idCopy) {
        setError('Please upload your Faculty ID copy')
        return false
      }
      if (!formData.employmentProof) {
        setError('Please upload your Proof of Employment document')
        return false
      }
      if (!formData.certification) {
        setError('You must certify that all information is accurate and complete')
        return false
      }
    }
    
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 4) {
        setCurrentStep((currentStep + 1) as RegistrationStep)
      } else {
        handleSubmit()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as RegistrationStep)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    try {
      // Here you would typically send the registration data to your backend
      console.log('Submitting registration:', formData)
      // After successful registration, redirect to login
      window.location.href = '/login?registered=true'
    } catch (err) {
      setError('Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-primary rounded-3xl p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/login"
                className="flex items-center justify-center h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-6 w-6 text-primary-foreground" />
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src="/logo.png"
                  alt="HandSpeak Logo"
                  width={50}
                  height={50}
                  className="drop-shadow-lg flex-shrink-0"
                />
                <h1 className="text-2xl font-bold text-primary-foreground whitespace-nowrap overflow-hidden text-ellipsis">Faculty Registration Request</h1>
              </div>
            </div>
            <div className="text-right flex flex-col items-end justify-start flex-shrink-0">
              <span className="text-sm font-semibold text-primary-foreground leading-none whitespace-nowrap">Step {currentStep} of</span>
              <span className="text-xl font-bold text-primary-foreground leading-none">4</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    step <= currentStep ? 'bg-white' : 'bg-white/30'
                  }`}
                  aria-label={`Step ${step} ${step <= currentStep ? 'completed' : 'pending'}`}
                />
              ))}
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl p-8">
            {/* Error Message with Better UX */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3 mb-6 flex items-start gap-3" role="alert">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Please fix the following:</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-600 uppercase tracking-wider">PERSONAL INFORMATION</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder="Enter middle name"
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Suffix
                    </label>
                    <input
                      type="text"
                      name="suffix"
                      value={formData.suffix}
                      onChange={handleInputChange}
                      placeholder="e.g. Jr."
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not">Prefer Not to Say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Birth Date *
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Employment Information */}
            {currentStep === 2 && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-600 uppercase tracking-wider">EMPLOYMENT INFORMATION</h2>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    placeholder="e.g. EMP-2026-99"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Faculty Position *
                    </label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Position</option>
                      <option value="teacher">Teacher</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="specialist">Specialist</option>
                      <option value="assistant">Assistant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Department</option>
                      <option value="fsl">Foreign Sign Language</option>
                      <option value="english">English</option>
                      <option value="special-ed">Special Education</option>
                      <option value="stem">STEM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Assigned Grade Level *
                  </label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Grade Level</option>
                    <option value="k">Kindergarten</option>
                    <option value="1-2">Grades 1-2</option>
                    <option value="3-4">Grades 3-4</option>
                    <option value="5-6">Grades 5-6</option>
                    <option value="7-8">Grades 7-8</option>
                    <option value="9-12">Grades 9-12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Assigned Sections (Multi-select) *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Section Alpha', 'Section Beta', 'Section Gamma', 'Section Delta'].map((section) => (
                      <label key={section} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-300 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.sections.includes(section)}
                          onChange={() => handleSectionToggle(section)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-foreground">{section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Account Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-600 uppercase tracking-wider">ACCOUNT INFORMATION</h2>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    School Email Address *
                  </label>
                  <input
                    type="email"
                    name="schoolEmail"
                    value={formData.schoolEmail}
                    onChange={handleInputChange}
                    placeholder="yourname@school.edu"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="fsl_teacher"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Verification Documents */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-600 uppercase tracking-wider">VERIFICATION DOCUMENTS</h2>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Upload Faculty ID Copy *
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-center">
                      <span className="text-sm text-gray-600">Select ID Scan (PDF/PNG)</span>
                      {formData.idCopy && <p className="text-xs text-primary mt-1">{formData.idCopy.name}</p>}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileChange(e, 'idCopy')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Upload Proof of Employment *
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-center">
                      <span className="text-sm text-gray-600">Select Certificate/Contract Copy</span>
                      {formData.employmentProof && <p className="text-xs text-primary mt-1">{formData.employmentProof.name}</p>}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileChange(e, 'employmentProof')}
                      className="hidden"
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="certification"
                    checked={formData.certification}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded mt-1"
                  />
                  <span className="text-sm text-foreground">
                    I certify that all records correspond exactly to actual structural institutional assignments.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-8 py-3 rounded-full font-semibold text-primary-foreground border-2 border-white/30 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous Step
            </button>
            <button
              onClick={handleNext}
              className="ml-auto px-8 py-3 rounded-full font-semibold bg-white text-primary hover:bg-gray-100 transition-colors"
            >
              {currentStep === 4 ? 'Transmit Registration Filing' : 'Continue Tracking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
