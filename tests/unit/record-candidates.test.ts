import { describe, expect, it } from "vitest";

import { decodeLattes, orcidId, periodsFromLattes, periodsFromOrcid } from "../../src/features/record-candidates/importers";
import {
  describeCandidate,
  describeYears,
  evidenceProblem,
  parseCandidates,
  parseColleagueForm,
  parseOptions,
  parseParticipationForm,
} from "../../src/features/record-candidates/parse";

const ANA = "d1000000-0000-4000-8000-000000000010";
const ORG = "d1000000-0000-4000-8000-000000000020";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("record proposals: forms", () => {
  it("accepts a period with a known institution", () => {
    const r = parseParticipationForm(
      form({ aboutPersonId: ANA, organizationId: ORG, capacity: "field_assistant", startYear: "1991", endYear: "1994", sourceNote: "Roster", evidencePath: ["u/a.pdf"] }),
    );
    expect(r).toEqual({
      ok: true,
      payload: expect.objectContaining({ kind: "participation", organizationId: ORG, newOrganizationName: null, startYear: 1991, endYear: 1994, evidencePaths: ["u/a.pdf"] }),
    });
  });

  it("asks for a source, an institution and sane years", () => {
    expect(parseParticipationForm(form({ aboutPersonId: ANA, organizationId: ORG, capacity: "x", sourceNote: " " })).ok).toBe(false);
    expect(parseParticipationForm(form({ aboutPersonId: ANA, capacity: "x", sourceNote: "s" })).ok).toBe(false);
    expect(parseParticipationForm(form({ aboutPersonId: ANA, newOrganizationName: "Lab", capacity: "x", sourceNote: "s", startYear: "1999", endYear: "1990" })).ok).toBe(false);
    expect(parseParticipationForm(form({ aboutPersonId: ANA, newOrganizationName: "Lab", capacity: "x", sourceNote: "s", startYear: "99" })).ok).toBe(false);
    expect(parseParticipationForm(form({ aboutPersonId: ANA, newOrganizationName: "Lab", capacity: "x", sourceNote: "s", isOngoing: "on" })).ok).toBe(false);
  });

  it("a colleague is chosen or named, never oneself", () => {
    const named = parseColleagueForm(
      form({ aboutPersonId: ANA, relationshipKind: "field_partnership", colleagueGivenName: "João", colleagueFamilyName: "Mateiro", colleagueOrcid: "https://orcid.org/0000-0002-1825-009x", sourceNote: "Field book" }),
    );
    expect(named.ok && named.payload.colleagueOrcid).toBe("0000-0002-1825-009X");
    expect(parseColleagueForm(form({ aboutPersonId: ANA, relationshipKind: "k", colleagueGivenName: "João", sourceNote: "s" })).ok).toBe(false);
    expect(parseColleagueForm(form({ aboutPersonId: ANA, relationshipKind: "k", colleaguePersonId: ANA, sourceNote: "s" })).ok).toBe(false);
    expect(parseColleagueForm(form({ aboutPersonId: ANA, relationshipKind: "k", colleaguePersonId: ORG, colleagueOrcid: "123", sourceNote: "s" })).ok).toBe(false);
  });

  it("checks evidence files", () => {
    expect(evidenceProblem({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(evidenceProblem({ type: "application/zip", size: 1000 })).not.toBeNull();
    expect(evidenceProblem({ type: "image/png", size: 16 * 1024 * 1024 })).not.toBeNull();
  });
});

describe("record proposals: reading", () => {
  it("reads options and candidates, dropping malformed rows", () => {
    expect(parseOptions({ capacities: [{ key: "a", label: "A" }, { key: "" }], relationshipKinds: null })).toEqual({
      capacities: [{ key: "a", label: "A" }],
      relationshipKinds: [],
    });
    const list = parseCandidates([
      { id: "1", kind: "relationship", aboutPersonId: ANA, aboutPersonName: "Ana", colleagueName: "João", isNewColleague: true, relationshipLabel: "Field partnership", startYear: 1992, sourceNote: "x", createdAt: "2026-10-28", origin: "orcid" },
      { id: "2", kind: "weird", aboutPersonId: ANA, sourceNote: "x", createdAt: "2026" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]!.origin).toBe("orcid");
    expect(describeCandidate(list[0]!)).toBe("Ana and João (new to the record): Field partnership, 1992");
  });

  it("describes years plainly", () => {
    expect(describeYears({ startYear: null, endYear: null, isOngoing: false })).toBe("date unknown");
    expect(describeYears({ startYear: 1991, endYear: null, isOngoing: true })).toBe("since 1991");
    expect(describeYears({ startYear: 1991, endYear: 1994, isOngoing: false })).toBe("1991–1994");
  });
});

describe("CV importers", () => {
  it("normalizes ORCID iDs", () => {
    expect(orcidId("https://orcid.org/0000-0002-1825-0097/")).toBe("0000-0002-1825-0097");
    expect(orcidId("nope")).toBeNull();
  });

  it("reads ORCID employments and educations", () => {
    const raw = {
      "affiliation-group": [
        {
          summaries: [
            {
              "employment-summary": {
                "put-code": 42,
                organization: { name: "Instituto Nacional de Pesquisas da Amazônia" },
                "role-title": "Researcher",
                "department-name": "Ecology",
                "start-date": { year: { value: "1990" } },
                "end-date": null,
              },
            },
          ],
        },
        { summaries: [{ "employment-summary": { organization: { name: "No code" } } }] },
      ],
    };
    expect(periodsFromOrcid(raw, "employment")).toEqual([
      {
        externalKey: "employment-42",
        organizationName: "Instituto Nacional de Pesquisas da Amazônia",
        capacity: "researcher",
        startYear: 1990,
        endYear: null,
        isOngoing: true,
        summary: "Researcher, Ecology",
      },
    ]);
    expect(periodsFromOrcid(null, "education")).toEqual([]);
  });

  it("reads a Lattes XML (formação + atuação)", () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<CURRICULO-VITAE><DADOS-GERAIS NOME-COMPLETO="Ana Field">
<FORMACAO-ACADEMICA-TITULACAO>
<GRADUACAO SEQUENCIA-FORMACAO="1" NOME-INSTITUICAO="Universidade Federal do Amazonas" NOME-CURSO="Ci&#234;ncias Biol&#243;gicas" STATUS-DO-CURSO="CONCLUIDO" ANO-DE-INICIO="1985" ANO-DE-CONCLUSAO="1989"/>
<DOUTORADO SEQUENCIA-FORMACAO="2" NOME-INSTITUICAO="INPA" NOME-CURSO="Ecologia" STATUS-DO-CURSO="EM_ANDAMENTO" ANO-DE-INICIO="2020" ANO-DE-CONCLUSAO=""></DOUTORADO>
</FORMACAO-ACADEMICA-TITULACAO>
<ATUACOES-PROFISSIONAIS><ATUACAO-PROFISSIONAL NOME-INSTITUICAO="Projeto Din&#226;mica Biol&#243;gica de Fragmentos Florestais">
<VINCULOS SEQUENCIA-HISTORICO="1" ANO-INICIO="1991" ANO-FIM="1994" OUTRO-ENQUADRAMENTO-FUNCIONAL-INFORMADO="Assistente de campo"/>
</ATUACAO-PROFISSIONAL></ATUACOES-PROFISSIONAIS>
</DADOS-GERAIS></CURRICULO-VITAE>`;
    const { name, periods } = periodsFromLattes(xml);
    expect(name).toBe("Ana Field");
    expect(periods.map((p) => [p.organizationName, p.capacity, p.startYear, p.endYear, p.isOngoing, p.summary])).toEqual([
      ["Universidade Federal do Amazonas", "student", 1985, 1989, false, "Graduação em Ciências Biológicas"],
      ["INPA", "student", 2020, null, true, "Doutorado em Ecologia"],
      ["Projeto Dinâmica Biológica de Fragmentos Florestais", "staff", 1991, 1994, false, "Assistente de campo"],
    ]);
  });

  it("decodes ISO-8859-1 Lattes files", () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><A N="'), 0xe9, ...new TextEncoder().encode('"/>')]);
    expect(decodeLattes(bytes)).toContain('N="é"');
  });
});
