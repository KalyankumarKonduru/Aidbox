import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AidboxClient } from '../services/aidbox-client.js';

export class AidboxFHIRTools {
  constructor(private client: AidboxClient) {}

  // Tool 1: Search Patients
  createSearchPatientsTool(): Tool {
    return {
      name: 'searchPatients',
      description: 'Search for patients in Aidbox by name, birthdate, identifier, or other criteria',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Patient name (first and/or last name)'
          },
          given: {
            type: 'string',
            description: 'Patient first/given name'
          },
          family: {
            type: 'string',
            description: 'Patient last/family name'
          },
          birthdate: {
            type: 'string',
            description: 'Patient birth date (YYYY-MM-DD)'
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'other', 'unknown']
          },
          identifier: {
            type: 'string',
            description: 'Patient identifier (MRN, SSN, etc.)'
          },
          phone: {
            type: 'string',
            description: 'Patient phone number'
          },
          email: {
            type: 'string',
            description: 'Patient email address'
          },
          _count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)'
          }
        }
      }
    };
  }

  async handleSearchPatients(args: any): Promise<any> {
    try {
      const params: any = {};
      
      // Map arguments to FHIR search parameters
      if (args.name) params.name = args.name;
      if (args.given) params.given = args.given;
      if (args.family) params.family = args.family;
      if (args.birthdate) params.birthdate = args.birthdate;
      if (args.gender) params.gender = args.gender;
      if (args.identifier) params.identifier = args.identifier;
      if (args.phone) params.phone = args.phone;
      if (args.email) params.email = args.email;
      params._count = args._count || 20;

      const bundle = await this.client.search('Patient', params);
      
      const patients = (bundle.entry || []).map((entry: any) => {
        const patient = entry.resource;
        return {
          id: patient.id,
          name: this.formatPatientName(patient.name),
          birthDate: patient.birthDate,
          gender: patient.gender,
          phone: this.extractPhone(patient.telecom),
          email: this.extractEmail(patient.telecom),
          address: this.formatAddress(patient.address),
          identifier: this.extractIdentifiers(patient.identifier)
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            patientsFound: patients.length,
            total: bundle.total || patients.length,
            patients
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('searchPatients', error);
    }
  }

  // Tool 2: Get Patient Details
  createGetPatientTool(): Tool {
    return {
      name: 'getPatientDetails',
      description: 'Get detailed information for a specific patient by ID',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Aidbox Patient ID',
            minLength: 1
          }
        },
        required: ['patientId']
      }
    };
  }

  async handleGetPatient(args: { patientId: string }): Promise<any> {
    try {
      const patient = await this.client.get('Patient', args.patientId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            patient: {
              id: patient.id,
              name: this.formatPatientName(patient.name),
              birthDate: patient.birthDate,
              gender: patient.gender,
              maritalStatus: patient.maritalStatus?.text,
              phone: this.extractPhone(patient.telecom),
              email: this.extractEmail(patient.telecom),
              address: this.formatAddress(patient.address),
              identifier: this.extractIdentifiers(patient.identifier),
              active: patient.active !== false,
              generalPractitioner: patient.generalPractitioner?.map((gp: any) => gp.display || gp.reference),
              communication: patient.communication?.map((comm: any) => comm.language.text || comm.language.coding?.[0]?.display)
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('getPatientDetails', error);
    }
  }

  // Tool 3: Create Patient
  createCreatePatientTool(): Tool {
    return {
      name: 'createPatient',
      description: 'Create a new patient in Aidbox',
      inputSchema: {
        type: 'object',
        properties: {
          given: {
            type: 'string',
            description: 'Patient first/given name'
          },
          family: {
            type: 'string',
            description: 'Patient last/family name'
          },
          birthDate: {
            type: 'string',
            description: 'Birth date (YYYY-MM-DD)'
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'other', 'unknown']
          },
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          email: {
            type: 'string',
            description: 'Email address'
          },
          address: {
            type: 'object',
            properties: {
              line: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              postalCode: { type: 'string' },
              country: { type: 'string' }
            }
          },
          identifier: {
            type: 'string',
            description: 'Patient identifier (MRN, etc.)'
          }
        },
        required: ['given', 'family']
      }
    };
  }

  async handleCreatePatient(args: any): Promise<any> {
    try {
      const patient: any = {
        resourceType: 'Patient',
        active: true,
        name: [{
          given: [args.given],
          family: args.family
        }]
      };

      if (args.birthDate) patient.birthDate = args.birthDate;
      if (args.gender) patient.gender = args.gender;
      
      if (args.phone || args.email) {
        patient.telecom = [];
        if (args.phone) {
          patient.telecom.push({
            system: 'phone',
            value: args.phone,
            use: 'home'
          });
        }
        if (args.email) {
          patient.telecom.push({
            system: 'email',
            value: args.email
          });
        }
      }

      if (args.address) {
        patient.address = [{
          line: args.address.line ? [args.address.line] : undefined,
          city: args.address.city,
          state: args.address.state,
          postalCode: args.address.postalCode,
          country: args.address.country
        }];
      }

      if (args.identifier) {
        patient.identifier = [{
          system: 'http://hospital.local/mrn',
          value: args.identifier
        }];
      }

      const created = await this.client.create('Patient', patient);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Patient created successfully',
            patientId: created.id,
            patient: {
              id: created.id,
              name: this.formatPatientName(created.name),
              birthDate: created.birthDate,
              gender: created.gender
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('createPatient', error);
    }
  }

  // Tool 4: Update Patient
  createUpdatePatientTool(): Tool {
    return {
      name: 'updatePatient',
      description: 'Update existing patient information',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID to update'
          },
          given: { type: 'string' },
          family: { type: 'string' },
          birthDate: { type: 'string' },
          gender: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] },
          phone: { type: 'string' },
          email: { type: 'string' },
          active: { type: 'boolean' }
        },
        required: ['patientId']
      }
    };
  }

  async handleUpdatePatient(args: any): Promise<any> {
    try {
      // Get existing patient
      const existing = await this.client.get('Patient', args.patientId);
      
      // Update fields
      if (args.given || args.family) {
        existing.name = existing.name || [{}];
        if (args.given) existing.name[0].given = [args.given];
        if (args.family) existing.name[0].family = args.family;
      }
      
      if (args.birthDate !== undefined) existing.birthDate = args.birthDate;
      if (args.gender !== undefined) existing.gender = args.gender;
      if (args.active !== undefined) existing.active = args.active;
      
      // Update telecom
      if (args.phone || args.email) {
        existing.telecom = existing.telecom || [];
        
        if (args.phone) {
          const phoneIndex = existing.telecom.findIndex((t: any) => t.system === 'phone');
          if (phoneIndex >= 0) {
            existing.telecom[phoneIndex].value = args.phone;
          } else {
            existing.telecom.push({ system: 'phone', value: args.phone });
          }
        }
        
        if (args.email) {
          const emailIndex = existing.telecom.findIndex((t: any) => t.system === 'email');
          if (emailIndex >= 0) {
            existing.telecom[emailIndex].value = args.email;
          } else {
            existing.telecom.push({ system: 'email', value: args.email });
          }
        }
      }

      const updated = await this.client.update('Patient', args.patientId, existing);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Patient updated successfully',
            patient: {
              id: updated.id,
              name: this.formatPatientName(updated.name),
              birthDate: updated.birthDate,
              gender: updated.gender,
              active: updated.active
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('updatePatient', error);
    }
  }

  // Tool 5: Get Patient Observations
  createGetObservationsTool(): Tool {
    return {
      name: 'getPatientObservations',
      description: 'Get lab results, vital signs, and other observations for a patient',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
            minLength: 1
          },
          category: {
            type: 'string',
            enum: ['vital-signs', 'laboratory', 'exam', 'survey', 'imaging'],
            description: 'Type of observations to retrieve'
          },
          code: {
            type: 'string',
            description: 'Specific observation code (LOINC)'
          },
          date: {
            type: 'string',
            description: 'Date range (e.g., ge2023-01-01)'
          },
          _count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)'
          }
        },
        required: ['patientId']
      }
    };
  }

  async handleGetObservations(args: any): Promise<any> {
    try {
      const params: any = {
        patient: args.patientId,
        _sort: '-date',
        _count: args._count || 20
      };
      
      if (args.category) params.category = args.category;
      if (args.code) params.code = args.code;
      if (args.date) params.date = args.date;

      const bundle = await this.client.search('Observation', params);
      
      const observations = (bundle.entry || []).map((entry: any) => {
        const obs = entry.resource;
        return {
          id: obs.id,
          status: obs.status,
          category: obs.category?.[0]?.coding?.[0]?.display || obs.category?.[0]?.text,
          code: {
            text: obs.code?.text,
            coding: obs.code?.coding?.[0]
          },
          value: this.formatObservationValue(obs),
          effectiveDateTime: obs.effectiveDateTime,
          issued: obs.issued,
          performer: obs.performer?.map((p: any) => p.display || p.reference)
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            observationsFound: observations.length,
            patientId: args.patientId,
            observations
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('getPatientObservations', error);
    }
  }

  // Tool 6: Create Observation
  createCreateObservationTool(): Tool {
    return {
      name: 'createObservation',
      description: 'Create a new observation (lab result, vital sign, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID'
          },
          code: {
            type: 'string',
            description: 'LOINC code for the observation'
          },
          display: {
            type: 'string',
            description: 'Display name for the observation'
          },
          value: {
            type: 'number',
            description: 'Numeric value'
          },
          unit: {
            type: 'string',
            description: 'Unit of measurement'
          },
          category: {
            type: 'string',
            enum: ['vital-signs', 'laboratory', 'exam', 'survey'],
            description: 'Observation category'
          },
          effectiveDateTime: {
            type: 'string',
            description: 'When the observation was taken (ISO datetime)'
          }
        },
        required: ['patientId', 'code', 'display', 'value']
      }
    };
  }

  async handleCreateObservation(args: any): Promise<any> {
    try {
      const observation: any = {
        resourceType: 'Observation',
        status: 'final',
        subject: {
          reference: `Patient/${args.patientId}`
        },
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: args.code,
            display: args.display
          }],
          text: args.display
        }
      };

      if (args.category) {
        observation.category = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: args.category,
            display: args.category
          }]
        }];
      }

      if (args.value !== undefined && args.unit) {
        observation.valueQuantity = {
          value: args.value,
          unit: args.unit,
          system: 'http://unitsofmeasure.org',
          code: args.unit
        };
      }

      observation.effectiveDateTime = args.effectiveDateTime || new Date().toISOString();

      const created = await this.client.create('Observation', observation);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Observation created successfully',
            observationId: created.id,
            observation: {
              id: created.id,
              code: args.display,
              value: args.value,
              unit: args.unit,
              effectiveDateTime: observation.effectiveDateTime
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('createObservation', error);
    }
  }

  // Tool 7: Get Patient Medications
  createGetMedicationsTool(): Tool {
    return {
      name: 'getPatientMedications',
      description: 'Get current and past medications for a patient',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
            minLength: 1
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'stopped', 'on-hold'],
            description: 'Medication status filter'
          },
          _count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)'
          }
        },
        required: ['patientId']
      }
    };
  }

  async handleGetMedications(args: any): Promise<any> {
    try {
      const params: any = {
        patient: args.patientId,
        _sort: '-_lastUpdated',
        _count: args._count || 20
      };
      
      if (args.status) params.status = args.status;

      const bundle = await this.client.search('MedicationRequest', params);
      
      const medications = (bundle.entry || []).map((entry: any) => {
        const med = entry.resource;
        return {
          id: med.id,
          status: med.status,
          medication: med.medicationCodeableConcept?.text || 
                     med.medicationCodeableConcept?.coding?.[0]?.display ||
                     med.medicationReference?.display,
          dosage: med.dosageInstruction?.map((dose: any) => ({
            text: dose.text,
            route: dose.route?.text,
            timing: dose.timing?.repeat
          })),
          authoredOn: med.authoredOn,
          requester: med.requester?.display
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            medicationsFound: medications.length,
            patientId: args.patientId,
            medications
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('getPatientMedications', error);
    }
  }

  // Tool 8: Create Medication Request
  createCreateMedicationRequestTool(): Tool {
    return {
      name: 'createMedicationRequest',
      description: 'Create a new medication request/prescription',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID'
          },
          medication: {
            type: 'string',
            description: 'Medication name'
          },
          dosageText: {
            type: 'string',
            description: 'Dosage instructions (e.g., "Take 1 tablet by mouth daily")'
          },
          quantity: {
            type: 'number',
            description: 'Quantity to dispense'
          },
          refills: {
            type: 'number',
            description: 'Number of refills'
          },
          status: {
            type: 'string',
            enum: ['active', 'on-hold', 'cancelled', 'completed'],
            description: 'Status (default: active)'
          }
        },
        required: ['patientId', 'medication', 'dosageText']
      }
    };
  }

  async handleCreateMedicationRequest(args: any): Promise<any> {
    try {
      const medicationRequest: any = {
        resourceType: 'MedicationRequest',
        status: args.status || 'active',
        intent: 'order',
        subject: {
          reference: `Patient/${args.patientId}`
        },
        medicationCodeableConcept: {
          text: args.medication
        },
        dosageInstruction: [{
          text: args.dosageText
        }],
        authoredOn: new Date().toISOString()
      };

      if (args.quantity) {
        medicationRequest.dispenseRequest = {
          quantity: {
            value: args.quantity
          }
        };
        
        if (args.refills !== undefined) {
          medicationRequest.dispenseRequest.numberOfRepeatsAllowed = args.refills;
        }
      }

      const created = await this.client.create('MedicationRequest', medicationRequest);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Medication request created successfully',
            medicationRequestId: created.id,
            medicationRequest: {
              id: created.id,
              medication: args.medication,
              dosage: args.dosageText,
              status: medicationRequest.status
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('createMedicationRequest', error);
    }
  }

  // Tool 9: Get Patient Conditions
  createGetConditionsTool(): Tool {
    return {
      name: 'getPatientConditions',
      description: 'Get diagnoses and medical conditions for a patient',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
            minLength: 1
          },
          clinicalStatus: {
            type: 'string',
            enum: ['active', 'resolved', 'inactive'],
            description: 'Filter by clinical status'
          },
          _count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)'
          }
        },
        required: ['patientId']
      }
    };
  }

  async handleGetConditions(args: any): Promise<any> {
    try {
      const params: any = {
        patient: args.patientId,
        _sort: '-onset-date',
        _count: args._count || 20
      };
      
      if (args.clinicalStatus) params['clinical-status'] = args.clinicalStatus;

      const bundle = await this.client.search('Condition', params);
      
      const conditions = (bundle.entry || []).map((entry: any) => {
        const condition = entry.resource;
        return {
          id: condition.id,
          clinicalStatus: condition.clinicalStatus?.coding?.[0]?.code,
          verificationStatus: condition.verificationStatus?.coding?.[0]?.code,
          code: {
            text: condition.code?.text,
            coding: condition.code?.coding?.[0]
          },
          onsetDateTime: condition.onsetDateTime,
          recordedDate: condition.recordedDate,
          recorder: condition.recorder?.display
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            conditionsFound: conditions.length,
            patientId: args.patientId,
            conditions
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('getPatientConditions', error);
    }
  }

  // Tool 10: Create Condition
  createCreateConditionTool(): Tool {
    return {
      name: 'createCondition',
      description: 'Create a new condition/diagnosis',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID'
          },
          code: {
            type: 'string',
            description: 'ICD-10 or SNOMED code'
          },
          display: {
            type: 'string',
            description: 'Condition name/display'
          },
          clinicalStatus: {
            type: 'string',
            enum: ['active', 'resolved', 'inactive'],
            description: 'Clinical status (default: active)'
          },
          onsetDateTime: {
            type: 'string',
            description: 'When the condition started (ISO datetime)'
          }
        },
        required: ['patientId', 'display']
      }
    };
  }

  async handleCreateCondition(args: any): Promise<any> {
    try {
      const condition: any = {
        resourceType: 'Condition',
        subject: {
          reference: `Patient/${args.patientId}`
        },
        code: {
          text: args.display
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: args.clinicalStatus || 'active'
          }]
        },
        recordedDate: new Date().toISOString()
      };

      if (args.code) {
        condition.code.coding = [{
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: args.code,
          display: args.display
        }];
      }

      if (args.onsetDateTime) {
        condition.onsetDateTime = args.onsetDateTime;
      }

      const created = await this.client.create('Condition', condition);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Condition created successfully',
            conditionId: created.id,
            condition: {
              id: created.id,
              code: args.display,
              clinicalStatus: args.clinicalStatus || 'active',
              recordedDate: condition.recordedDate
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('createCondition', error);
    }
  }

  // Tool 11: Get Patient Encounters
  createGetEncountersTool(): Tool {
    return {
      name: 'getPatientEncounters',
      description: 'Get healthcare encounters/visits for a patient',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
            minLength: 1
          },
          status: {
            type: 'string',
            enum: ['planned', 'arrived', 'in-progress', 'finished'],
            description: 'Encounter status filter'
          },
          type: {
            type: 'string',
            description: 'Encounter type (e.g., ambulatory, inpatient)'
          },
          _count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)'
          }
        },
        required: ['patientId']
      }
    };
  }

  async handleGetEncounters(args: any): Promise<any> {
    try {
      const params: any = {
        patient: args.patientId,
        _sort: '-date',
        _count: args._count || 20
      };
      
      if (args.status) params.status = args.status;
      if (args.type) params.type = args.type;

      const bundle = await this.client.search('Encounter', params);
      
      const encounters = (bundle.entry || []).map((entry: any) => {
        const encounter = entry.resource;
        return {
          id: encounter.id,
          status: encounter.status,
          class: encounter.class?.display || encounter.class?.code,
          type: encounter.type?.[0]?.text || encounter.type?.[0]?.coding?.[0]?.display,
          period: {
            start: encounter.period?.start,
            end: encounter.period?.end
          },
          reasonCode: encounter.reasonCode?.[0]?.text,
          participant: encounter.participant?.map((p: any) => ({
            type: p.type?.[0]?.text,
            individual: p.individual?.display
          }))
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            encountersFound: encounters.length,
            patientId: args.patientId,
            encounters
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('getPatientEncounters', error);
    }
  }

  // Tool 12: Create Encounter
  createCreateEncounterTool(): Tool {
    return {
      name: 'createEncounter',
      description: 'Create a new encounter/visit',
      inputSchema: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID'
          },
          status: {
            type: 'string',
            enum: ['planned', 'arrived', 'in-progress', 'finished'],
            description: 'Encounter status'
          },
          class: {
            type: 'string',
            enum: ['ambulatory', 'emergency', 'inpatient', 'virtual'],
            description: 'Encounter class'
          },
          type: {
            type: 'string',
            description: 'Type of encounter (e.g., "Routine checkup")'
          },
          startDateTime: {
            type: 'string',
            description: 'Start date/time (ISO datetime)'
          },
          endDateTime: {
            type: 'string',
            description: 'End date/time (ISO datetime)'
          },
          reasonCode: {
            type: 'string',
            description: 'Reason for visit'
          }
        },
        required: ['patientId', 'status', 'class']
      }
    };
  }

  async handleCreateEncounter(args: any): Promise<any> {
    try {
      const encounter: any = {
        resourceType: 'Encounter',
        status: args.status,
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: args.class,
          display: args.class
        },
        subject: {
          reference: `Patient/${args.patientId}`
        }
      };

      if (args.type) {
        encounter.type = [{
          text: args.type
        }];
      }

      if (args.startDateTime || args.endDateTime) {
        encounter.period = {};
        if (args.startDateTime) encounter.period.start = args.startDateTime;
        if (args.endDateTime) encounter.period.end = args.endDateTime;
      }

      if (args.reasonCode) {
        encounter.reasonCode = [{
          text: args.reasonCode
        }];
      }

      const created = await this.client.create('Encounter', encounter);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Encounter created successfully',
            encounterId: created.id,
            encounter: {
              id: created.id,
              status: args.status,
              class: args.class,
              type: args.type,
              period: encounter.period
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('createEncounter', error);
    }
  }

  // Helper methods
  private formatPatientName(names: any[]): string {
    if (!names || names.length === 0) return 'Unknown';
    const name = names[0];
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim();
  }

  private extractPhone(telecoms: any[]): string | undefined {
    if (!telecoms) return undefined;
    const phone = telecoms.find(t => t.system === 'phone');
    return phone?.value;
  }

  private extractEmail(telecoms: any[]): string | undefined {
    if (!telecoms) return undefined;
    const email = telecoms.find(t => t.system === 'email');
    return email?.value;
  }

  private formatAddress(addresses: any[]): any {
    if (!addresses || addresses.length === 0) return null;
    const addr = addresses[0];
    return {
      line: addr.line?.join(', '),
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country
    };
  }

  private extractIdentifiers(identifiers: any[]): any[] {
    if (!identifiers) return [];
    return identifiers.map(id => ({
      system: id.system,
      value: id.value,
      type: id.type?.text
    }));
  }

  private formatObservationValue(obs: any): any {
    if (obs.valueQuantity) {
      return {
        value: obs.valueQuantity.value,
        unit: obs.valueQuantity.unit
      };
    }
    if (obs.valueString) return obs.valueString;
    if (obs.valueBoolean !== undefined) return obs.valueBoolean;
    if (obs.valueCodeableConcept) return obs.valueCodeableConcept.text;
    if (obs.components) {
      return obs.components.map((comp: any) => ({
        code: comp.code?.text,
        value: comp.valueQuantity?.value,
        unit: comp.valueQuantity?.unit
      }));
    }
    return null;
  }

  private handleError(toolName: string, error: any): any {
    console.error(`Aidbox ${toolName} error:`, error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message || 'Unknown error occurred',
          tool: toolName,
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: true
    };
  }

  // Get all tools
  getAllTools(): Tool[] {
    return [
      this.createSearchPatientsTool(),
      this.createGetPatientTool(),
      this.createCreatePatientTool(),
      this.createUpdatePatientTool(),
      this.createGetObservationsTool(),
      this.createCreateObservationTool(),
      this.createGetMedicationsTool(),
      this.createCreateMedicationRequestTool(),
      this.createGetConditionsTool(),
      this.createCreateConditionTool(),
      this.createGetEncountersTool(),
      this.createCreateEncounterTool()
    ];
  }
}