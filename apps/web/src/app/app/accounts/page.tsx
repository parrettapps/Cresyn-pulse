'use client';

import { useState, useEffect } from 'react';
import { Users, Building2, StickyNote, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { apiClient } from '../../../lib/api-client';
import { CompanyFormModal } from './components/company-form-modal';
import { ContactFormModal } from './components/contact-form-modal';
import type {
  Company,
  Contact,
  CompanyType,
  CompanyStats,
  PaginatedResponse,
} from '../../../types/crm';

type TypeBadgeConfig = {
  label: string;
  variant: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning';
};

const TYPE_BADGE: Record<string, TypeBadgeConfig> = {
  customer: { label: 'Customer', variant: 'primary' },
  partner: { label: 'Partner', variant: 'secondary' },
  vendor: { label: 'Vendor', variant: 'neutral' },
  supplier: { label: 'Supplier', variant: 'warning' },
};

const FALLBACK_TYPE_BADGE: TypeBadgeConfig = { label: 'Other', variant: 'neutral' };

const TYPE_FILTERS: Array<{ label: string; value: CompanyType | null }> = [
  { label: 'All', value: null },
  { label: 'Customers', value: 'customer' },
  { label: 'Partners', value: 'partner' },
  { label: 'Vendors', value: 'vendor' },
];

export default function AccountsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'companies' | 'contacts'>('companies');

  // Company state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [contactsCount, setContactsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<CompanyType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Contact state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Fetch data on mount and when filters change (with debounce for search)
  useEffect(() => {
    // Debounce search queries to avoid rate limiting
    const timeoutId = setTimeout(() => {
      fetchData();
    }, searchQuery ? 300 : 0); // 300ms delay for search, immediate for filter changes

    return () => clearTimeout(timeoutId);
  }, [typeFilter, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCompanies(), fetchStats()]);
    } catch (error) {
      console.error('Failed to fetch accounts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await apiClient.get<PaginatedResponse<Company>>('/companies', {
        params: {
          type: typeFilter ?? undefined,
          search: searchQuery || undefined,
          limit: 50,
        },
      });
      setCompanies(response.data.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [statsResponse, contactsCountResponse] = await Promise.all([
        apiClient.get<CompanyStats>('/companies/stats'),
        apiClient.get<{ count: number }>('/contacts/count'),
      ]);
      setStats(statsResponse.data);
      setContactsCount(contactsCountResponse.data.count);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch contacts separately (with debounce for search)
  useEffect(() => {
    if (activeTab === 'contacts') {
      // Debounce search queries to avoid rate limiting
      const timeoutId = setTimeout(() => {
        fetchContacts();
      }, contactSearchQuery ? 300 : 0); // 300ms delay for search, immediate otherwise

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, contactSearchQuery]);

  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const response = await apiClient.get<PaginatedResponse<Contact>>('/contacts', {
        params: {
          search: contactSearchQuery || undefined,
          limit: 50,
        },
      });
      setContacts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompany(company);
    setShowCompanyModal(true);
  };

  const handleDeleteCompany = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${company.name}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/companies/${company.id}`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete company:', error);
      alert('Failed to delete company. Please try again.');
    }
  };

  const handleCompanyModalSuccess = () => {
    fetchData(); // Refresh data after create/update
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Contact handlers
  const handleAddContact = () => {
    setEditingContact(null);
    setShowContactModal(true);
  };

  const handleEditContact = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setShowContactModal(true);
  };

  const handleDeleteContact = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/contacts/${contact.id}`);
      fetchContacts(); // Refresh contacts
      fetchStats(); // Update contact count
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleContactModalSuccess = () => {
    fetchContacts(); // Refresh contacts after create/update
    fetchStats(); // Update contact count
  };

  const handleContactSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactSearchQuery(e.target.value);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Accounts</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Manage companies, contacts, and relationships.</p>
          </div>
          <Button
            size="sm"
            onClick={activeTab === 'companies' ? handleAddCompany : handleAddContact}
          >
            <UserPlus className="h-4 w-4" />
            {activeTab === 'companies' ? 'Add Company' : 'Add Contact'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center gap-1 border-b border-neutral-200 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('companies')}
            className={
              activeTab === 'companies'
                ? 'border-b-2 border-primary-500 px-4 py-2 text-sm font-semibold text-primary-600'
                : 'px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors'
            }
          >
            Companies
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={
              activeTab === 'contacts'
                ? 'border-b-2 border-primary-500 px-4 py-2 text-sm font-semibold text-primary-600'
                : 'px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors'
            }
          >
            Contacts
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard
          title="Total Companies"
          value={stats?.total.toString() ?? '0'}
          delta={`+${stats?.recentCount ?? 0} this week`}
          deltaDirection={stats?.recentCount ? 'up' : 'neutral'}
          icon={Building2}
          iconColor="primary"
        />
        <StatCard
          title="Active Contacts"
          value={contactsCount.toString()}
          icon={Users}
          iconColor="secondary"
        />
        <StatCard
          title="Open Notes"
          value="0"
          icon={StickyNote}
          iconColor="warning"
        />
        <StatCard
          title="New This Week"
          value={stats?.recentCount.toString() ?? '0'}
          delta="On track"
          deltaDirection="neutral"
          icon={UserPlus}
          iconColor="success"
        />
      </div>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="mx-6 mb-6 flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setTypeFilter(filter.value)}
                className={
                  typeFilter === filter.value
                    ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-neutral-100 text-neutral-800'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors'
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search companies…"
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-8 w-48 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="w-24 px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">
                    Loading companies...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">
                    {searchQuery || typeFilter
                      ? 'No companies found matching your filters.'
                      : 'No companies yet. Click "Add Company" to get started.'}
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const typeBadge = TYPE_BADGE[company.type] ?? FALLBACK_TYPE_BADGE;
                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-neutral-50/70 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-neutral-600">
                          {company.companyCode ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-600">
                            {company.name.charAt(0)}
                          </div>
                          <span className="font-medium text-neutral-900">
                            {company.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500">
                        {company.city && company.state
                          ? `${company.city}, ${company.state}`
                          : company.city || company.state || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 text-sm">
                        {company.email || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="hidden group-hover:flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleEditCompany(company, e)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                            title="Edit company"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCompany(company, e)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Delete company"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">
            Showing {companies.length} of {stats?.total ?? 0} companies
          </p>
        </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="mx-6 mb-6 flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <div className="text-sm font-medium text-neutral-700">All Contacts</div>
            <div className="flex items-center gap-2">
              <input
                type="search"
                placeholder="Search contacts…"
                value={contactSearchQuery}
                onChange={handleContactSearchChange}
                className="h-8 w-48 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="w-24 px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {contactsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">
                      Loading contacts...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-neutral-300" />
                        <p className="text-sm font-medium text-neutral-500">No contacts yet</p>
                        <p className="text-xs text-neutral-400">
                          Add your first contact to get started
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    // Find company name if contact has a company
                    const company = contact.companyId
                      ? companies.find((c) => c.id === contact.companyId)
                      : null;

                    return (
                      <tr key={contact.id} className="group hover:bg-neutral-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-700">
                              {contact.firstName.charAt(0).toUpperCase()}
                              {contact.lastName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">
                                {contact.firstName} {contact.lastName}
                              </div>
                              {contact.isPrimary && (
                                <Badge variant="success" size="sm">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-neutral-600">
                          {company?.name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-neutral-600">
                          {contact.title || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 text-sm">
                          {contact.email || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 text-sm">
                          {contact.phone || contact.mobile || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="hidden group-hover:flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleEditContact(contact, e)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                              title="Edit contact"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteContact(contact, e)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Delete contact"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
            <p className="text-xs text-neutral-400">
              Showing {contacts.length} contacts
            </p>
          </div>
        </div>
      )}

      {/* Company form modal */}
      <CompanyFormModal
        open={showCompanyModal}
        onClose={() => {
          setShowCompanyModal(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
        onSuccess={handleCompanyModalSuccess}
      />

      {/* Contact form modal */}
      <ContactFormModal
        open={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setEditingContact(null);
        }}
        contact={editingContact}
        onSuccess={handleContactModalSuccess}
      />
    </div>
  );
}
