import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AidboxClient } from '../services/aidbox-client.js';
export declare class AidboxFHIRTools {
    private client;
    constructor(client: AidboxClient);
    createSearchPatientsTool(): Tool;
    handleAidboxSearchPatients(args: any): Promise<any>;
    createGetPatientTool(): Tool;
    handleAidboxGetPatient(args: {
        patientId: string;
    }): Promise<any>;
    createCreatePatientTool(): Tool;
    handleAidboxCreatePatient(args: any): Promise<any>;
    createUpdatePatientTool(): Tool;
    handleAidboxUpdatePatient(args: any): Promise<any>;
    createGetObservationsTool(): Tool;
    handleAidboxGetObservations(args: any): Promise<any>;
    createCreateObservationTool(): Tool;
    handleAidboxCreateObservation(args: any): Promise<any>;
    createGetMedicationsTool(): Tool;
    handleAidboxGetMedications(args: any): Promise<any>;
    createCreateMedicationRequestTool(): Tool;
    handleAidboxCreateMedicationRequest(args: any): Promise<any>;
    createGetConditionsTool(): Tool;
    handleAidboxGetConditions(args: any): Promise<any>;
    createCreateConditionTool(): Tool;
    handleAidboxCreateCondition(args: any): Promise<any>;
    createGetEncountersTool(): Tool;
    handleAidboxGetEncounters(args: any): Promise<any>;
    createCreateEncounterTool(): Tool;
    handleAidboxCreateEncounter(args: any): Promise<any>;
    private formatPatientName;
    private extractPhone;
    private extractEmail;
    private formatAddress;
    private extractIdentifiers;
    private formatObservationValue;
    private handleError;
    getAllTools(): Tool[];
}
//# sourceMappingURL=aidbox-fhir-tools.d.ts.map