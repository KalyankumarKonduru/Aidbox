import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AidboxClient } from '../services/aidbox-client.js';
export declare class AidboxFHIRTools {
    private client;
    constructor(client: AidboxClient);
    createSearchPatientsTool(): Tool;
    handleSearchPatients(args: any): Promise<any>;
    createGetPatientTool(): Tool;
    handleGetPatient(args: {
        patientId: string;
    }): Promise<any>;
    createCreatePatientTool(): Tool;
    handleCreatePatient(args: any): Promise<any>;
    createUpdatePatientTool(): Tool;
    handleUpdatePatient(args: any): Promise<any>;
    createGetObservationsTool(): Tool;
    handleGetObservations(args: any): Promise<any>;
    createCreateObservationTool(): Tool;
    handleCreateObservation(args: any): Promise<any>;
    createGetMedicationsTool(): Tool;
    handleGetMedications(args: any): Promise<any>;
    createCreateMedicationRequestTool(): Tool;
    handleCreateMedicationRequest(args: any): Promise<any>;
    createGetConditionsTool(): Tool;
    handleGetConditions(args: any): Promise<any>;
    createCreateConditionTool(): Tool;
    handleCreateCondition(args: any): Promise<any>;
    createGetEncountersTool(): Tool;
    handleGetEncounters(args: any): Promise<any>;
    createCreateEncounterTool(): Tool;
    handleCreateEncounter(args: any): Promise<any>;
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