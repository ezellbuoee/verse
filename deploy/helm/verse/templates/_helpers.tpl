{{- define "verse.name" -}}{{ .Release.Name }}-verse{{- end -}}
{{- define "verse.labels" -}}
app.kubernetes.io/name: verse
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
{{- define "verse.selector" -}}
app.kubernetes.io/name: verse
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
{{- define "verse.image" -}}
{{- $reg := .root.Values.image.registry -}}
{{- if $reg }}{{ $reg }}/{{ end }}{{ .name }}:{{ .root.Values.image.tag }}
{{- end -}}
{{- define "verse.host" -}}{{ .Values.publicUrl | trimPrefix "https://" | trimPrefix "http://" | trimSuffix "/" }}{{- end -}}
{{- define "verse.pgHost" -}}
{{- if .Values.postgres.enabled }}{{ include "verse.name" . }}-postgres{{ else }}{{ required "postgres.external.host is required when postgres.enabled=false" .Values.postgres.external.host }}{{ end -}}
{{- end -}}
{{- define "verse.pgPort" -}}{{ if .Values.postgres.enabled }}5432{{ else }}{{ .Values.postgres.external.port }}{{ end }}{{- end -}}
{{/* a value kept stable across upgrades: existing secret value wins, else the given value, else a random one */}}
{{- define "verse.keep" -}}
{{- $existing := lookup "v1" "Secret" .ns .secret -}}
{{- if and $existing (index $existing.data .key) }}{{ index $existing.data .key | b64dec }}{{ else if .value }}{{ .value }}{{ else }}{{ randAlphaNum 40 }}{{ end -}}
{{- end -}}
{{/* the server and the frontend run as non-root with a read-only view of the system */}}
{{- define "verse.containerSecurity" -}}
allowPrivilegeEscalation: false
runAsNonRoot: true
capabilities: { drop: [ALL] }
{{- end -}}
{{/* wait until PostgreSQL accepts connections */}}
{{- define "verse.waitForDb" -}}
- name: wait-for-db
  image: busybox:1.36
  command: ["sh", "-c", "until nc -z {{ include "verse.pgHost" . }} {{ include "verse.pgPort" . }}; do echo waiting for postgres; sleep 3; done"]
  securityContext: {{- include "verse.containerSecurity" . | nindent 4 }}
    runAsUser: 65534
{{- end -}}
