import { Inject, Injectable } from '@nestjs/common';
import { IMetaGraphApiPort, META_GRAPH_API_PORT } from '../ports/meta-graph-api.port';
import { LeadForm } from '../../domain/entities/lead-form.entity';

@Injectable()
export class GetLeadFormsUseCase {
  constructor(
    @Inject(META_GRAPH_API_PORT) private readonly metaGraphApi: IMetaGraphApiPort,
  ) {}

  async execute(pageId?: string): Promise<LeadForm[]> {
    return this.metaGraphApi.fetchPageLeadForms(pageId);
  }
}
